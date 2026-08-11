-- Site visibility: who is using the store, what they look for, and what they
-- fail to find.
--
-- Deliberately cookieless. The live privacy page says "There are no advertising
-- or analytics cookies, which is why you are not being asked to consent to any"
-- — adding a tracking cookie would make that sentence false and would require a
-- consent banner. Visitors are counted with a daily-rotating salted hash of
-- IP + user agent instead: not reversible, not stable across days, so it cannot
-- accumulate into a profile.

create table if not exists public.page_views (
  id            uuid primary key default gen_random_uuid(),
  path          text not null,
  -- Daily-rotating hash. Comparable within a day, meaningless across days.
  visitor_hash  text,
  referrer_host text,
  created_at    timestamptz not null default now()
);

create index if not exists page_views_created_idx on public.page_views (created_at desc);
create index if not exists page_views_path_idx    on public.page_views (path, created_at desc);
create index if not exists page_views_visitor_idx on public.page_views (visitor_hash, created_at desc);

-- ---------------------------------------------------------------------------
-- Searches.
--
-- results_count is the point of this table. A search that returns nothing is a
-- customer telling you exactly what to stock, and it is invisible in every
-- other measure — they simply leave.
-- ---------------------------------------------------------------------------
create table if not exists public.search_events (
  id            uuid primary key default gen_random_uuid(),
  query         text not null,
  -- Lower-cased, punctuation stripped, so "E3Z-D61" and "e3z d61" group.
  normalized    text not null,
  results_count integer not null default 0,
  category      text,
  visitor_hash  text,
  created_at    timestamptz not null default now()
);

create index if not exists search_events_created_idx    on public.search_events (created_at desc);
create index if not exists search_events_normalized_idx on public.search_events (normalized);
create index if not exists search_events_zero_idx
  on public.search_events (normalized, created_at desc) where results_count = 0;

-- Nothing here is readable from the browser; the admin reads it through a route
-- handler that has already checked the caller.
alter table public.page_views    enable row level security;
alter table public.search_events enable row level security;

drop policy if exists page_views_no_select on public.page_views;
create policy page_views_no_select on public.page_views for select using (false);

drop policy if exists search_events_no_select on public.search_events;
create policy search_events_no_select on public.search_events for select using (false);

-- ---------------------------------------------------------------------------
-- Retention.
--
-- The privacy page promises quote requests are deleted after two years; raw
-- analytics has no reason to live even that long. Run this periodically — as a
-- Supabase scheduled job, or by hand.
-- ---------------------------------------------------------------------------
create or replace function public.prune_analytics(p_days integer default 180)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer := 0;
  n       integer;
begin
  delete from page_views where created_at < now() - (p_days || ' days')::interval;
  get diagnostics n = row_count; removed := removed + n;

  delete from search_events where created_at < now() - (p_days || ' days')::interval;
  get diagnostics n = row_count; removed := removed + n;

  return removed;
end;
$$;

revoke all on function public.prune_analytics(integer) from public, anon, authenticated;
grant execute on function public.prune_analytics(integer) to service_role;
