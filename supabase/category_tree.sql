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
