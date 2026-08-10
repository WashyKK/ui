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
