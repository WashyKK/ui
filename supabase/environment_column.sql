-- Tag every order with the payment environment that produced it.
--
-- Everything in these tables today came from M-Pesa sandbox and Stripe test keys,
-- so it is all backfilled to 'test'. Once real keys go live, reporting can filter
-- on environment = 'live' instead of trying to tell test rows apart by date.

alter table orders       add column if not exists environment text not null default 'test';
alter table mpesa_orders add column if not exists environment text not null default 'test';

-- Existing rows predate the column's default; make the intent explicit.
update orders       set environment = 'test' where environment is null;
update mpesa_orders set environment = 'test' where environment is null;

alter table orders
  drop constraint if exists orders_environment_check,
  add constraint orders_environment_check check (environment in ('test', 'live'));

alter table mpesa_orders
  drop constraint if exists mpesa_orders_environment_check,
  add constraint mpesa_orders_environment_check check (environment in ('test', 'live'));

create index if not exists orders_environment_idx       on orders (environment);
create index if not exists mpesa_orders_environment_idx on mpesa_orders (environment);

-- Flip the default to 'live' at go-live, in the same change that swaps the keys:
--   alter table orders       alter column environment set default 'live';
--   alter table mpesa_orders alter column environment set default 'live';
