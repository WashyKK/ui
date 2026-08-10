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
