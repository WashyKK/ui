-- Quote requests and support enquiries.
--
-- The only lead form on the site built a mailto: link to a personal Gmail
-- address, which meant enquiries were unlogged, unassignable, and pointed at
-- the wrong inbox once support moved to admin@elffie.com.

create table if not exists public.contact_messages (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null default 'enquiry',
  name         text not null,
  email        text not null,
  phone        text,
  company      text,
  subject      text,
  message      text not null,
  product_id   uuid references public.products(id) on delete set null,
  handled      boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table public.contact_messages
  drop constraint if exists contact_messages_kind_check,
  add constraint contact_messages_kind_check check (kind in ('enquiry', 'quote', 'support'));

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);
create index if not exists contact_messages_handled_idx
  on public.contact_messages (handled) where handled = false;

alter table public.contact_messages enable row level security;

-- Writes go through the service role in a route handler that rate-limits and
-- validates; nothing reads this from the browser.
drop policy if exists contact_messages_no_select on public.contact_messages;
create policy contact_messages_no_select on public.contact_messages for select using (false);
