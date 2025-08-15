-- Enable required extensions (only run if not enabled)
create extension if not exists pgcrypto;

-- Products table
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(12,2) not null,
  stock integer not null default 0,
  category text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Simple updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute procedure public.set_updated_at();

-- Indexes
create index if not exists products_created_at_idx on public.products (created_at desc);
create index if not exists products_category_idx on public.products (category);

-- Row Level Security
alter table public.products enable row level security;

-- Allow anyone to select (public catalog)
drop policy if exists products_select_all on public.products;
create policy products_select_all on public.products
  for select using (true);

-- Do NOT add insert/update/delete policies — these will be performed via service role only.

