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
