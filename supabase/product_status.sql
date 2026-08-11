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
