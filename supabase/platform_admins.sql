-- Platform admins.
--
-- Admin access has been a single address in the ADMIN_EMAIL environment
-- variable: one person, changeable only by editing Vercel config and
-- redeploying, and unrecoverable if that account is lost. `user_roles` already
-- carried store managers, but its check constraint rejected 'admin'.
--
-- Widening it lets admins be granted from the admin panel like any other role.
-- ADMIN_EMAIL keeps working as the bootstrap owner, so there is always one
-- account that cannot be locked out by a mistake in this table.

alter table public.user_roles
  drop constraint if exists user_roles_role_check,
  add constraint user_roles_role_check check (role in ('admin', 'store_manager'));

-- Who granted this, and when — an admin who can appoint other admins is worth
-- an audit trail.
alter table public.user_roles
  add column if not exists invited_at timestamptz not null default now(),
  add column if not exists accepted_at timestamptz;

comment on column public.user_roles.accepted_at is
  'First sign-in after the grant. Null means invited but never signed in.';

-- Grants are looked up lower-cased at sign-in, so store them that way.
update public.user_roles set email = lower(trim(email)) where email <> lower(trim(email));

create unique index if not exists user_roles_email_key on public.user_roles (email);
