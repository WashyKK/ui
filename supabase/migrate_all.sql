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


-- ===========================================================================
-- product_resources.sql
-- ===========================================================================
-- Everything a technical buyer needs on a product page beyond one photo and one PDF.
--
-- product_images already exists (catalog_depth.sql). This adds the other three
-- collections: multiple titled documents, links to useful resources, and code
-- snippets showing how to actually drive the part.
--
-- In each case the existing single column stays as the primary — image_url is
-- the thumbnail, datasheet_url is the headline datasheet — so nothing that
-- reads them breaks and the grid still has one image and one PDF to show.

-- ---------------------------------------------------------------------------
-- Documents
--
-- One datasheet is rarely the whole story: there is a datasheet, a user manual,
-- a CAD drawing, a CE/RoHS certificate, an application note. Titling them
-- matters — "PDF" tells a buyer nothing about which of the five it is.
-- ---------------------------------------------------------------------------
create table if not exists public.product_documents (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url        text not null,
  title      text not null,
  kind       text not null default 'datasheet',
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.product_documents
  drop constraint if exists product_documents_kind_check,
  add constraint product_documents_kind_check check (kind in (
    'datasheet', 'manual', 'drawing', 'certificate', 'application_note', 'other'
  ));

create index if not exists product_documents_product_idx
  on public.product_documents (product_id, position);

-- ---------------------------------------------------------------------------
-- Links
--
-- The manufacturer's product page, a GitHub library, a wiring guide, a video.
-- Held separately from documents because these are not ours and are not files:
-- deleting one frees nothing, and they can rot.
-- ---------------------------------------------------------------------------
create table if not exists public.product_links (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  url         text not null,
  title       text not null,
  description text,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists product_links_product_idx
  on public.product_links (product_id, position);

-- ---------------------------------------------------------------------------
-- Code snippets
--
-- The difference between selling a sensor and selling a sensor someone can use
-- this afternoon. A wiring snippet or a five-line read loop answers the support
-- email before it is written.
-- ---------------------------------------------------------------------------
create table if not exists public.product_snippets (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  title       text not null,
  language    text not null default 'text',
  code        text not null,
  description text,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists product_snippets_product_idx
  on public.product_snippets (product_id, position);

-- ---------------------------------------------------------------------------
-- Read-only to the public, like products and product_images. Writes go through
-- a route handler that has already checked the caller.
-- ---------------------------------------------------------------------------
alter table public.product_documents enable row level security;
alter table public.product_links     enable row level security;
alter table public.product_snippets  enable row level security;

drop policy if exists product_documents_select_all on public.product_documents;
create policy product_documents_select_all on public.product_documents for select using (true);

drop policy if exists product_links_select_all on public.product_links;
create policy product_links_select_all on public.product_links for select using (true);

drop policy if exists product_snippets_select_all on public.product_snippets;
create policy product_snippets_select_all on public.product_snippets for select using (true);

-- Carry the existing single datasheet across so nothing has to be re-uploaded.
insert into public.product_documents (product_id, url, title, kind, position)
select p.id, p.datasheet_url, 'Datasheet', 'datasheet', 0
  from public.products p
 where p.datasheet_url is not null
   and not exists (
     select 1 from public.product_documents d
      where d.product_id = p.id and d.url = p.datasheet_url
   );


-- ===========================================================================
-- category_tree.sql
-- ===========================================================================
-- Sub-categories: Motors > DC > Stepper.
--
-- Categories were flat, which forces every distinction into the name itself
-- ("DC Stepper Motors") and makes "show me everything under Motors" impossible.
-- Adding a parent turns them into a tree of arbitrary depth.

alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete restrict,
  add column if not exists slug      text,
  add column if not exists position  integer not null default 0;

create index if not exists categories_parent_idx on public.categories (parent_id, position);

-- Siblings must be distinct, but "Stepper" under Motors>DC and "Stepper" under
-- Motors>AC are different categories and both are legitimate.
create unique index if not exists categories_unique_sibling_name
  on public.categories (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

create unique index if not exists categories_slug_key on public.categories (slug)
  where slug is not null;

-- ---------------------------------------------------------------------------
-- Cycle prevention.
--
-- Without this, setting a node's parent to its own descendant produces a ring
-- that no recursive query can terminate on — every read of the tree hangs, not
-- just the bad row.
-- ---------------------------------------------------------------------------
create or replace function public.categories_prevent_cycle()
returns trigger
language plpgsql
as $$
declare
  cursor_id uuid := new.parent_id;
  hops      integer := 0;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'A category cannot be its own parent';
  end if;

  while cursor_id is not null loop
    if cursor_id = new.id then
      raise exception 'That would put % inside its own subtree', new.name;
    end if;
    select parent_id into cursor_id from categories where id = cursor_id;

    hops := hops + 1;
    if hops > 50 then
      raise exception 'Category nesting is too deep, or the tree is already cyclic';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists categories_no_cycles on public.categories;
create trigger categories_no_cycles
before insert or update of parent_id on public.categories
for each row execute procedure public.categories_prevent_cycle();

-- ---------------------------------------------------------------------------
-- Slugs, mirroring the product slug rules.
-- ---------------------------------------------------------------------------
create or replace function public.set_category_slug()
returns trigger
language plpgsql
as $$
declare
  candidate text;
begin
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;

  candidate := trim(both '-' from regexp_replace(lower(coalesce(new.name, '')), '[^a-z0-9]+', '-', 'g'));
  candidate := left(candidate, 60);

  if candidate = '' then
    return new;
  end if;

  if exists (select 1 from categories where slug = candidate and id <> new.id) then
    candidate := candidate || '-' || left(replace(new.id::text, '-', ''), 5);
  end if;

  new.slug := candidate;
  return new;
end;
$$;

drop trigger if exists categories_set_slug on public.categories;
create trigger categories_set_slug
before insert on public.categories
for each row execute procedure public.set_category_slug();

update public.categories
   set slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
 where slug is null;

-- ---------------------------------------------------------------------------
-- Reading the tree.
--
-- Descendants is the one that matters for the storefront: filtering by "Motors"
-- has to match a product filed under "Stepper", three levels down. Doing that
-- in the database rather than in the client means the filter still works when
-- the catalogue outgrows a single fetch.
-- ---------------------------------------------------------------------------
create or replace function public.category_descendants(p_root uuid)
returns table (id uuid)
language sql
stable
as $$
  with recursive tree as (
    select c.id from categories c where c.id = p_root
    union all
    select c.id from categories c join tree t on c.parent_id = t.id
  )
  select id from tree;
$$;

-- Full tree with depth and a materialised "Motors › DC › Stepper" path, for the
-- admin list and for breadcrumbs.
create or replace view public.category_tree as
  with recursive tree as (
    select
      c.id, c.name, c.description, c.parent_id, c.slug, c.position,
      0 as depth,
      c.name::text as path,
      array[c.position, 0] as sort_key
    from categories c
    where c.parent_id is null
    union all
    select
      c.id, c.name, c.description, c.parent_id, c.slug, c.position,
      t.depth + 1,
      (t.path || ' › ' || c.name)::text,
      t.sort_key || array[c.position, 0]
    from categories c
    join tree t on c.parent_id = t.id
  )
  select id, name, description, parent_id, slug, position, depth, path, sort_key
  from tree;

grant select on public.category_tree to anon, authenticated, service_role;


-- ===========================================================================
-- analytics.sql
-- ===========================================================================
-- Site visibility: who is using the store, what they look for, and what they
-- fail to find.
--
-- Deliberately cookieless. The live privacy page says "There are no advertising
-- or analytics cookies, which is why you are not being asked to consent to any"
-- — adding a tracking cookie would make that sentence false and would require a
-- consent banner. Visitors are counted with a daily-rotating salted hash of
-- IP + user agent instead: not reversible, not stable across days, so it cannot
-- accumulate into a profile.

create table if not exists public.page_views (
  id            uuid primary key default gen_random_uuid(),
  path          text not null,
  -- Daily-rotating hash. Comparable within a day, meaningless across days.
  visitor_hash  text,
  referrer_host text,
  created_at    timestamptz not null default now()
);

create index if not exists page_views_created_idx on public.page_views (created_at desc);
create index if not exists page_views_path_idx    on public.page_views (path, created_at desc);
create index if not exists page_views_visitor_idx on public.page_views (visitor_hash, created_at desc);

-- ---------------------------------------------------------------------------
-- Searches.
--
-- results_count is the point of this table. A search that returns nothing is a
-- customer telling you exactly what to stock, and it is invisible in every
-- other measure — they simply leave.
-- ---------------------------------------------------------------------------
create table if not exists public.search_events (
  id            uuid primary key default gen_random_uuid(),
  query         text not null,
  -- Lower-cased, punctuation stripped, so "E3Z-D61" and "e3z d61" group.
  normalized    text not null,
  results_count integer not null default 0,
  category      text,
  visitor_hash  text,
  created_at    timestamptz not null default now()
);

create index if not exists search_events_created_idx    on public.search_events (created_at desc);
create index if not exists search_events_normalized_idx on public.search_events (normalized);
create index if not exists search_events_zero_idx
  on public.search_events (normalized, created_at desc) where results_count = 0;

-- Nothing here is readable from the browser; the admin reads it through a route
-- handler that has already checked the caller.
alter table public.page_views    enable row level security;
alter table public.search_events enable row level security;

drop policy if exists page_views_no_select on public.page_views;
create policy page_views_no_select on public.page_views for select using (false);

drop policy if exists search_events_no_select on public.search_events;
create policy search_events_no_select on public.search_events for select using (false);

-- ---------------------------------------------------------------------------
-- Retention.
--
-- The privacy page promises quote requests are deleted after two years; raw
-- analytics has no reason to live even that long. Run this periodically — as a
-- Supabase scheduled job, or by hand.
-- ---------------------------------------------------------------------------
create or replace function public.prune_analytics(p_days integer default 180)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer := 0;
  n       integer;
begin
  delete from page_views where created_at < now() - (p_days || ' days')::interval;
  get diagnostics n = row_count; removed := removed + n;

  delete from search_events where created_at < now() - (p_days || ' days')::interval;
  get diagnostics n = row_count; removed := removed + n;

  return removed;
end;
$$;

revoke all on function public.prune_analytics(integer) from public, anon, authenticated;
grant execute on function public.prune_analytics(integer) to service_role;


-- ===========================================================================
-- product_status.sql
-- ===========================================================================
-- Listing status, and a way to retire a product that has been sold.
--
-- Deleting a product that appears on an order fails, correctly:
--   update or delete on table "products" violates foreign key constraint
--   "orders_product_id_fkey" on table "orders"
--
-- That constraint is ON DELETE RESTRICT and it should stay. An order is a
-- record of what somebody actually bought and paid for; letting a catalogue
-- edit rewrite it would corrupt history and break every report and receipt that
-- reads back through it. What was missing was the thing actually wanted —
-- taking something off the shelf without erasing it.
--
-- Three states, deliberately distinct from stock:
--
--   active    listed everywhere, buyable
--   unlisted  off the catalogue, search and sitemap — but the direct link still
--             works and still sells. For a part you will supply on request, or
--             one you are not ready to promote.
--   archived  gone. Not listed, direct link 404s, cannot be added to a cart.
--             This is what "delete" means for anything with order history.
--
-- Out of stock stays a separate, temporary fact about quantity. A part can be
-- listed and out of stock (with a back-in-stock alert), or in stock and
-- unlisted. Conflating them would lose the back-in-stock signal.

alter table public.products
  add column if not exists status      text not null default 'active',
  add column if not exists archived_at timestamptz;

alter table public.products
  drop constraint if exists products_status_check,
  add constraint products_status_check check (status in ('active', 'unlisted', 'archived'));

-- The catalogue reads active-only on every page, so this index carries the
-- storefront's hottest query.
create index if not exists products_status_idx on public.products (status)
  where status = 'active';

comment on column public.products.status is
  'active = listed and buyable; unlisted = direct link only; archived = retired, kept for order history.';

-- Stamp the moment of retirement, so "when did we stop selling this" is
-- answerable later.
create or replace function public.set_product_archived_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'archived' and (old.status is distinct from 'archived') then
    new.archived_at := now();
  elsif new.status <> 'archived' then
    new.archived_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists products_archived_at on public.products;
create trigger products_archived_at
before update of status on public.products
for each row execute procedure public.set_product_archived_at();


