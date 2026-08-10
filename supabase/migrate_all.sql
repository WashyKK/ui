-- Elffie store — all pending migrations, in dependency order.
-- Generated from the individual files in supabase/. Safe to re-run:
-- every statement is idempotent (if not exists / or replace / drop-then-create).
--
-- Paste into the Supabase SQL editor and run once.

-- ===========================================================================
-- decrement_stock.sql
-- ===========================================================================
-- Atomic stock decrement.
--
-- Replaces a read-then-write in the payment handlers: two orders landing at the
-- same moment both read the old stock and both wrote back the same value, so one
-- decrement was silently lost. A single UPDATE ... SET stock = stock - qty takes
-- a row lock and serialises them.
--
-- Stock is floored at zero rather than raising, because the caller runs after the
-- money is already captured — refusing here would leave a paid order unrecorded.
-- Availability is enforced before charging, in the checkout routes.

create or replace function public.decrement_stock(
  p_product_id uuid,
  p_quantity   integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_stock integer;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'decrement_stock: quantity must be positive, got %', p_quantity;
  end if;

  update products
     set stock = greatest(0, coalesce(stock, 0) - p_quantity)
   where id = p_product_id
  returning stock into new_stock;

  if not found then
    raise warning 'decrement_stock: no product with id %', p_product_id;
    return null;
  end if;

  return new_stock;
end;
$$;

revoke all on function public.decrement_stock(uuid, integer) from public, anon, authenticated;
grant execute on function public.decrement_stock(uuid, integer) to service_role;


-- ===========================================================================
-- environment_column.sql
-- ===========================================================================
-- Tag every order with the payment environment that produced it.
--
-- Everything in these tables today came from M-Pesa sandbox and Stripe test keys,
-- so it is all backfilled to 'test'. Once real keys go live, reporting can filter
-- on environment = 'live' instead of trying to tell test rows apart by date.

alter table orders       add column if not exists environment text not null default 'test';
alter table mpesa_orders add column if not exists environment text not null default 'test';

-- Existing rows predate the column's default; make the intent explicit.
update orders       set environment = 'test' where environment is null;
update mpesa_orders set environment = 'test' where environment is null;

alter table orders
  drop constraint if exists orders_environment_check,
  add constraint orders_environment_check check (environment in ('test', 'live'));

alter table mpesa_orders
  drop constraint if exists mpesa_orders_environment_check,
  add constraint mpesa_orders_environment_check check (environment in ('test', 'live'));

create index if not exists orders_environment_idx       on orders (environment);
create index if not exists mpesa_orders_environment_idx on mpesa_orders (environment);

-- Flip the default to 'live' at go-live, in the same change that swaps the keys:
--   alter table orders       alter column environment set default 'live';
--   alter table mpesa_orders alter column environment set default 'live';


-- ===========================================================================
-- orders_canonical.sql
-- ===========================================================================
-- One order model.
--
-- Today an order can live in either of two tables with incompatible shapes:
-- orders.cart_items is [{productId, quantity}] and mpesa_orders.cart_items is
-- [{id, name, price, quantity}], so every consumer branches on which table a row
-- came from and re-resolves product names differently. Order history, the admin
-- panel, emails and reporting all pay that tax.
--
-- This makes `orders` canonical. mpesa_orders stays for the legacy Daraja path
-- until it is retired; nothing new writes to it.

alter table public.orders
  -- Multi-item carts have always written NULL here, contradicting the original
  -- NOT NULL. items jsonb is the real record; these two are legacy single-item.
  alter column product_id drop not null,
  alter column stripe_session_id drop not null;

alter table public.orders
  add column if not exists order_number     text,
  add column if not exists provider         text,
  add column if not exists provider_ref     text,
  add column if not exists status           text not null default 'pending',
  add column if not exists currency         text not null default 'KES',
  add column if not exists amount_minor     bigint,
  add column if not exists subtotal_usd     numeric(12,2),
  add column if not exists shipping_usd     numeric(12,2),
  add column if not exists fx_rate_usd_kes  numeric(12,4),
  add column if not exists items            jsonb,
  add column if not exists customer_phone   text,
  add column if not exists payment_channel  text,
  add column if not exists payment_receipt  text,
  add column if not exists updated_at       timestamptz not null default now();

-- items shape, enforced by convention in src/lib/orders.ts:
--   [{ "productId": uuid, "name": text, "unitPriceUsd": number, "quantity": int }]
-- Name and unit price are snapshotted at purchase time so a later price edit or
-- product rename never rewrites history.

comment on column public.orders.items is
  'Canonical line items: [{productId, name, unitPriceUsd, quantity}], snapshotted at purchase.';
comment on column public.orders.fx_rate_usd_kes is
  'USD→KES rate used to compute amount_minor at charge time. Never recompute a past order with a current rate.';

alter table public.orders
  drop constraint if exists orders_status_check,
  add constraint orders_status_check check (status in (
    'pending', 'paid', 'processing', 'packed', 'shipped', 'delivered',
    'cancelled', 'refunded', 'failed'
  ));

alter table public.orders
  drop constraint if exists orders_provider_check,
  add constraint orders_provider_check check (provider is null or provider in (
    'paystack', 'stripe', 'mpesa'
  ));

create unique index if not exists orders_order_number_key on public.orders (order_number)
  where order_number is not null;

-- One order per provider reference: the webhook may be delivered more than once,
-- and Paystack explicitly retries until it gets a 200.
create unique index if not exists orders_provider_ref_key on public.orders (provider, provider_ref)
  where provider_ref is not null;

create index if not exists orders_status_idx     on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_email_idx      on public.orders (lower(customer_email));

-- Backfill the two legacy Stripe rows so every row satisfies the new model.
update public.orders
   set provider     = coalesce(provider, 'stripe'),
       provider_ref = coalesce(provider_ref, stripe_session_id),
       status       = case when status = 'pending' then 'paid' else status end,
       currency     = coalesce(currency, 'USD')
 where stripe_session_id is not null;

-- RLS stays deny-all: every read goes through the service role in a route handler
-- that has already checked who is asking.
alter table public.orders enable row level security;


-- ===========================================================================
-- orders_fulfilment.sql
-- ===========================================================================
-- Everything needed to actually pack and dispatch an order.
--
-- Until now checkout collected an email, a shipping zone and a phone number.
-- That is not enough to put a box on a courier, and it is a long way short of
-- what a procurement officer expects to see before authorising a large order.

alter table public.orders
  -- Kenyan delivery. Postal codes and "state" are close to useless here; what a
  -- rider actually needs is a town, a landmark and a phone number that answers.
  add column if not exists recipient_name    text,
  add column if not exists delivery_county   text,
  add column if not exists delivery_town     text,
  add column if not exists delivery_landmark text,
  add column if not exists pickup_point      text,
  add column if not exists delivery_notes    text,

  -- International fallback, used when the shipping zone is outside Kenya.
  add column if not exists address_line1     text,
  add column if not exists address_city      text,
  add column if not exists address_state     text,
  add column if not exists address_postcode  text,
  add column if not exists address_country   text,

  -- B2B. Half of what this store sells goes onto someone's books.
  add column if not exists company_name      text,
  add column if not exists kra_pin           text,
  add column if not exists po_reference      text,
  add column if not exists terms_accepted_at timestamptz,

  -- Fulfilment.
  add column if not exists tracking_number   text,
  add column if not exists carrier           text,
  add column if not exists shipped_at        timestamptz,
  add column if not exists delivered_at      timestamptz,
  add column if not exists admin_notes       text;

-- Who changed an order, when, and from what to what. Without this, "the customer
-- says they were told it shipped last week" is unanswerable.
create table if not exists public.order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  event       text not null,
  from_status text,
  to_status   text,
  note        text,
  actor       text,
  created_at  timestamptz not null default now()
);

create index if not exists order_events_order_id_idx
  on public.order_events (order_id, created_at desc);

alter table public.order_events enable row level security;

-- Deny-all, like orders: every read goes through a route handler that has
-- already established who is asking.
drop policy if exists order_events_no_select on public.order_events;
create policy order_events_no_select on public.order_events for select using (false);


-- ===========================================================================
-- contact_messages.sql
-- ===========================================================================
-- Quote requests and support enquiries.
--
-- The only lead form on the site built a mailto: link to a personal Gmail
-- address, which meant enquiries were unlogged, unassignable, and pointed at
-- the wrong inbox once support moved to admin@elffie.com.

create table if not exists public.contact_messages (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null default 'enquiry',
  name         text not null,
  email        text not null,
  phone        text,
  company      text,
  subject      text,
  message      text not null,
  product_id   uuid references public.products(id) on delete set null,
  handled      boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table public.contact_messages
  drop constraint if exists contact_messages_kind_check,
  add constraint contact_messages_kind_check check (kind in ('enquiry', 'quote', 'support'));

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);
create index if not exists contact_messages_handled_idx
  on public.contact_messages (handled) where handled = false;

alter table public.contact_messages enable row level security;

-- Writes go through the service role in a route handler that rate-limits and
-- validates; nothing reads this from the browser.
drop policy if exists contact_messages_no_select on public.contact_messages;
create policy contact_messages_no_select on public.contact_messages for select using (false);


-- ===========================================================================
-- catalog_depth.sql
-- ===========================================================================
-- Catalogue depth: part numbers, multiple images, real categories, relations.

-- ---------------------------------------------------------------------------
-- 1. Part numbers
--
-- A buyer arrives knowing "17HS4401" or "E3Z-D61", not a product name. There was
-- no sku column and search covered only name, description and category, so that
-- buyer got zero results and left.
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists sku          text,
  add column if not exists manufacturer text,
  add column if not exists mpn          text;   -- manufacturer part number

comment on column public.products.sku is 'Our internal stock code.';
comment on column public.products.mpn is 'Manufacturer part number — what the buyer searches for.';

create unique index if not exists products_sku_key on public.products (upper(sku))
  where sku is not null;
create index if not exists products_mpn_idx on public.products (upper(mpn))
  where mpn is not null;

-- ---------------------------------------------------------------------------
-- 2. Multiple images
--
-- products.image_url held exactly one URL. An industrial buyer is checking the
-- connector face, the mounting hole pattern, the port layout and the rating
-- label — one hero shot answers none of that.
--
-- image_url stays as the primary/thumbnail so nothing that reads it breaks.
-- ---------------------------------------------------------------------------
create table if not exists public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url        text not null,
  alt        text,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_idx
  on public.product_images (product_id, position);

alter table public.product_images enable row level security;
drop policy if exists product_images_select_all on public.product_images;
create policy product_images_select_all on public.product_images for select using (true);

-- ---------------------------------------------------------------------------
-- 3. Categories as a real foreign key
--
-- The admin form stored the category NAME into a free-text column, so renaming a
-- category silently orphaned every product filed under it — the delete dialog in
-- the admin panel says as much out loud.
--
-- category_id becomes authoritative; the old text column stays populated by a
-- trigger so existing readers keep working while they are migrated.
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists category_id uuid references public.categories(id) on delete set null;

create index if not exists products_category_id_idx on public.products (category_id);

-- Backfill by name, case-insensitively, for rows that have not been linked yet.
update public.products p
   set category_id = c.id
  from public.categories c
 where p.category_id is null
   and p.category is not null
   and lower(trim(p.category)) = lower(trim(c.name));

-- Keep products.category in step with the linked category's name, including
-- after a rename. This is what makes renaming safe.
create or replace function public.sync_product_category_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.category_id is not null then
    select name into new.category from categories where id = new.category_id;
  end if;
  return new;
end;
$$;

drop trigger if exists products_sync_category_name on public.products;
create trigger products_sync_category_name
before insert or update of category_id on public.products
for each row execute procedure public.sync_product_category_name();

create or replace function public.cascade_category_rename()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is distinct from old.name then
    update products set category = new.name where category_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists categories_cascade_rename on public.categories;
create trigger categories_cascade_rename
after update on public.categories
for each row execute procedure public.cascade_category_rename();

-- ---------------------------------------------------------------------------
-- 4. Curated relations
--
-- Not "more from this category", which for this catalogue means showing four
-- more motors to someone who needs the driver board. The useful relation is
-- editorial: what this part REQUIRES, what pairs with it, what replaces it.
-- ---------------------------------------------------------------------------
create table if not exists public.product_relations (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  related_id   uuid not null references public.products(id) on delete cascade,
  relation     text not null,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  constraint product_relations_unique unique (product_id, related_id, relation),
  constraint product_relations_not_self check (product_id <> related_id),
  constraint product_relations_kind check (relation in (
    'requires', 'accessory', 'alternative', 'spare'
  ))
);

create index if not exists product_relations_product_idx
  on public.product_relations (product_id, relation, position);

alter table public.product_relations enable row level security;
drop policy if exists product_relations_select_all on public.product_relations;
create policy product_relations_select_all on public.product_relations for select using (true);


-- ===========================================================================
-- product_slugs.sql
-- ===========================================================================
-- Human-readable product URLs.
--
-- Products have always been addressed by UUID — /product/1f0c…-…. Those links
-- are in customers' WhatsApp history and email, so this is strictly additive:
-- the page resolves by slug OR by id, and old links keep working.

alter table public.products
  add column if not exists slug text;

create unique index if not exists products_slug_key on public.products (slug)
  where slug is not null;

-- Mirrors buildProductSlug() in src/lib/slug.ts: name, plus the part number when
-- it is not already in the name, so two "proximity sensor" listings from
-- different manufacturers do not collide.
create or replace function public.build_product_slug(p_name text, p_mpn text)
returns text
language plpgsql
immutable
as $$
declare
  base   text;
  suffix text;
begin
  base := trim(both '-' from regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g'));
  base := left(base, 70);
  base := trim(both '-' from base);

  suffix := trim(both '-' from regexp_replace(lower(coalesce(p_mpn, '')), '[^a-z0-9]+', '-', 'g'));

  if suffix = '' or position(suffix in base) > 0 then
    return base;
  end if;

  return trim(both '-' from left(base || '-' || suffix, 90));
end;
$$;

-- Backfill, disambiguating collisions with a short id fragment rather than a
-- counter, so re-running this is stable.
update public.products p
   set slug = case
     when exists (
       select 1 from public.products q
        where q.id <> p.id
          and public.build_product_slug(q.name, q.mpn) = public.build_product_slug(p.name, p.mpn)
     )
     then public.build_product_slug(p.name, p.mpn) || '-' || left(replace(p.id::text, '-', ''), 6)
     else public.build_product_slug(p.name, p.mpn)
   end
 where slug is null
   and public.build_product_slug(p.name, p.mpn) <> '';

-- Keep a slug on every new product without the application having to remember.
create or replace function public.set_product_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;

  candidate := build_product_slug(new.name, new.mpn);
  if candidate = '' then
    return new;
  end if;

  if exists (select 1 from products where slug = candidate and id <> new.id) then
    candidate := candidate || '-' || left(replace(new.id::text, '-', ''), 6);
  end if;

  new.slug := candidate;
  return new;
end;
$$;

drop trigger if exists products_set_slug on public.products;
create trigger products_set_slug
before insert on public.products
for each row execute procedure public.set_product_slug();

create index if not exists products_search_idx
  on public.products using gin (
    to_tsvector('english',
      coalesce(name, '') || ' ' ||
      coalesce(mpn, '') || ' ' ||
      coalesce(manufacturer, '') || ' ' ||
      coalesce(category, '') || ' ' ||
      coalesce(description, '')
    )
  );


-- ===========================================================================
-- alerts_and_attributes.sql
-- ===========================================================================
-- ---------------------------------------------------------------------------
-- Back-in-stock alerts
--
-- A Kenyan buyer who needs one specific driver board has no easy local
-- substitute — they cannot just buy it elsewhere this afternoon. Today the
-- product page tells them "Out of stock" and offers nothing, so a real,
-- qualified customer leaves with no way back. This turns that into a lead.
-- ---------------------------------------------------------------------------
create table if not exists public.stock_alerts (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  email       text not null,
  notified_at timestamptz,
  created_at  timestamptz not null default now(),
  -- One open request per person per part; re-subscribing after a notification
  -- is allowed because notified_at makes the rows distinct.
  constraint stock_alerts_unique unique (product_id, email, notified_at)
);

create index if not exists stock_alerts_pending_idx
  on public.stock_alerts (product_id) where notified_at is null;

alter table public.stock_alerts enable row level security;
drop policy if exists stock_alerts_no_select on public.stock_alerts;
create policy stock_alerts_no_select on public.stock_alerts for select using (false);

-- ---------------------------------------------------------------------------
-- Spec attributes
--
-- Buyers arrive knowing 24 V, IP65, NEMA 17, M12, CANopen — not a price band.
-- Those values currently exist only inside PDF datasheets, which Google indexes
-- poorly and this site's own search cannot read at all.
--
-- Normalised rather than a jsonb blob: faceting needs to count distinct values
-- per key, and attribute_keys stops three people inventing "Voltage",
-- "voltage" and "Supply voltage" for the same facet.
-- ---------------------------------------------------------------------------
create table if not exists public.attribute_keys (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  label      text not null,
  unit       text,
  position   integer not null default 0,
  facetable  boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.product_attributes (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  key_id     uuid not null references public.attribute_keys(id) on delete cascade,
  value      text not null,
  created_at timestamptz not null default now(),
  constraint product_attributes_unique unique (product_id, key_id, value)
);

create index if not exists product_attributes_product_idx
  on public.product_attributes (product_id);
create index if not exists product_attributes_key_value_idx
  on public.product_attributes (key_id, value);

alter table public.attribute_keys enable row level security;
alter table public.product_attributes enable row level security;

drop policy if exists attribute_keys_select_all on public.attribute_keys;
create policy attribute_keys_select_all on public.attribute_keys for select using (true);
drop policy if exists product_attributes_select_all on public.product_attributes;
create policy product_attributes_select_all on public.product_attributes for select using (true);

-- A starting vocabulary for this catalogue. Extend it rather than letting free
-- text back in.
insert into public.attribute_keys (key, label, unit, position) values
  ('supply_voltage',   'Supply voltage',      'V',   10),
  ('current_rating',   'Current rating',      'A',   20),
  ('power',            'Power',               'W',   30),
  ('ip_rating',        'IP rating',           null,  40),
  ('output_type',      'Output type',         null,  50),
  ('connection',       'Connection',          null,  60),
  ('protocol',         'Protocol',            null,  70),
  ('mounting',         'Mounting',            null,  80),
  ('frame_size',       'Frame size',          null,  90),
  ('sensing_distance', 'Sensing distance',    'mm', 100),
  ('operating_temp',   'Operating temperature','°C', 110),
  ('certification',    'Certification',       null, 120)
on conflict (key) do nothing;


