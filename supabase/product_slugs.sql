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
