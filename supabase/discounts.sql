-- Per-product discounts.
--
-- A sale price rather than a percentage, because a shop sets "this is now
-- KSh 2,400", not "this is now 17.4% off" — and storing the percentage means
-- the actual price moves whenever the list price is edited, which is never what
-- was meant. The percentage shown to the customer is derived for display only.
--
-- Prices here are USD, matching products.price. What the customer pays is
-- converted to KES at checkout by the same rate as everything else.

alter table public.products
  add column if not exists sale_price     numeric(12,2),
  add column if not exists sale_starts_at timestamptz,
  add column if not exists sale_ends_at   timestamptz;

-- A sale that is not cheaper is not a sale, and a negative price would be a
-- refund. Both are rejected at the database rather than trusted from a form.
alter table public.products
  drop constraint if exists products_sale_price_check,
  add constraint products_sale_price_check
    check (sale_price is null or (sale_price >= 0 and sale_price < price));

alter table public.products
  drop constraint if exists products_sale_window_check,
  add constraint products_sale_window_check
    check (sale_starts_at is null or sale_ends_at is null or sale_ends_at > sale_starts_at);

comment on column public.products.sale_price is
  'Discounted price in USD. Active only inside the sale window; the window bounds are optional and open-ended when null.';

-- Partial index: the storefront asks "what is on sale" far more often than it
-- touches the other 95% of rows.
create index if not exists products_on_sale_idx
  on public.products (sale_ends_at) where sale_price is not null;
