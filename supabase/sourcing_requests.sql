-- Requests for parts that are not in the catalogue.
--
-- These already arrive through /contact as kind = 'quote', but a message in a
-- table nobody works through is a lead that quietly ages out. This turns them
-- into a pipeline with a status, and adds the fields a sourcing conversation
-- actually needs — part number, quantity, what they hoped to pay, when they
-- need it — so the first reply can be a price rather than four questions.

alter table public.contact_messages
  add column if not exists status        text not null default 'new',
  add column if not exists part_number   text,
  add column if not exists quantity      integer,
  add column if not exists target_price  numeric(12,2),
  add column if not exists needed_by     date,
  add column if not exists quoted_minor  bigint,
  add column if not exists quoted_at     timestamptz,
  add column if not exists lead_time     text,
  add column if not exists admin_notes   text,
  add column if not exists handled_by    text,
  add column if not exists updated_at    timestamptz not null default now();

alter table public.contact_messages
  drop constraint if exists contact_messages_status_check,
  add constraint contact_messages_status_check check (status in (
    'new',        -- just arrived
    'sourcing',   -- asking suppliers
    'quoted',     -- price and lead time sent
    'ordered',    -- they accepted, it is on the way
    'declined',   -- we cannot source it
    'closed'      -- resolved or gone quiet
  ));

-- The old boolean is redundant now that status carries the state; keep it in
-- step so anything still reading it does not go stale.
update public.contact_messages
   set status = case when handled then 'closed' else status end
 where handled = true and status = 'new';

create index if not exists contact_messages_status_idx
  on public.contact_messages (status, created_at desc);
create index if not exists contact_messages_open_idx
  on public.contact_messages (created_at desc)
  where status in ('new', 'sourcing', 'quoted');

-- Searches that found nothing are the same signal arriving anonymously. This
-- view puts both in one place so the admin works one list.
create or replace view public.demand_signals as
  select
    'request'::text                     as source,
    c.id::text                          as id,
    coalesce(c.part_number, c.subject, left(c.message, 80)) as term,
    c.status                            as status,
    c.email                             as email,
    c.quantity                          as quantity,
    c.created_at                        as created_at
  from public.contact_messages c
  where c.kind = 'quote';

grant select on public.demand_signals to service_role;
