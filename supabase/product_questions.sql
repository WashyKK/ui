-- What people ask the assistant about a part.
--
-- Two uses. It rate-limits the assistant from a real store rather than an
-- in-memory counter, which resets on every cold start and so caps nothing on a
-- serverless host. And the questions themselves are a demand signal in the same
-- way a zero-result search is: five people asking whether a sensor does IO-Link
-- is a product page missing a specification, or a part you should be stocking.

create table if not exists public.product_questions (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid references public.products(id) on delete set null,
  question     text not null,
  -- The same daily-rotating cookieless hash the rest of the analytics uses.
  visitor_hash text,
  created_at   timestamptz not null default now()
);

create index if not exists product_questions_created_idx
  on public.product_questions (created_at desc);
-- The rate-limit lookup: this exact shape, every request.
create index if not exists product_questions_rate_idx
  on public.product_questions (visitor_hash, created_at desc);
create index if not exists product_questions_product_idx
  on public.product_questions (product_id, created_at desc);

alter table public.product_questions enable row level security;

drop policy if exists product_questions_no_select on public.product_questions;
create policy product_questions_no_select on public.product_questions for select using (false);

-- Questions age out with the rest of the analytics.
create or replace function public.prune_product_questions(p_days integer default 180)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare removed integer;
begin
  delete from product_questions where created_at < now() - (p_days || ' days')::interval;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.prune_product_questions(integer) from public, anon, authenticated;
grant execute on function public.prune_product_questions(integer) to service_role;
