create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique not null,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null default 1,
  amount_total bigint not null default 0,
  customer_email text,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

-- Basic read for admins only (adjust as needed). For now, block public select.
drop policy if exists orders_select_all on public.orders;
create policy orders_no_select on public.orders for select using (false);

