-- Gift cards and store credit.
--
-- This is money, so the shape is a ledger with a cached balance, not a balance
-- someone edits. Every movement is a row; the balance is what the rows add up
-- to. That way a disputed card can be explained rather than guessed at.
--
-- Amounts are KES minor units (cents), integer. Never floats — a float balance
-- drifts, and drifting money is the one bug you cannot apologise your way out
-- of. KSh 1,000 is stored as 100000.

create table if not exists public.gift_cards (
  id             uuid primary key default gen_random_uuid(),
  -- Shown to the customer. Unguessable: generated from 20 random bits per
  -- character, not from a counter or a timestamp.
  code           text not null,
  initial_minor  bigint not null check (initial_minor > 0),
  balance_minor  bigint not null check (balance_minor >= 0),
  currency       text not null default 'KES',
  status         text not null default 'active',
  issued_to      text,
  note           text,
  issued_by      text,
  expires_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.gift_cards
  drop constraint if exists gift_cards_status_check,
  add constraint gift_cards_status_check check (status in ('active', 'disabled', 'expired'));

-- Balance can never exceed what was issued.
alter table public.gift_cards
  drop constraint if exists gift_cards_balance_bound,
  add constraint gift_cards_balance_bound check (balance_minor <= initial_minor);

create unique index if not exists gift_cards_code_key on public.gift_cards (upper(code));
create index if not exists gift_cards_status_idx on public.gift_cards (status);

-- The ledger. Every issue, redemption, refund and adjustment.
create table if not exists public.gift_card_transactions (
  id            uuid primary key default gen_random_uuid(),
  gift_card_id  uuid not null references public.gift_cards(id) on delete cascade,
  kind          text not null,
  -- Signed: negative spends, positive returns.
  amount_minor  bigint not null,
  balance_after bigint not null,
  order_number  text,
  actor         text,
  created_at    timestamptz not null default now()
);

alter table public.gift_card_transactions
  drop constraint if exists gift_card_transactions_kind_check,
  add constraint gift_card_transactions_kind_check
    check (kind in ('issue', 'redeem', 'refund', 'adjust', 'void'));

create index if not exists gift_card_tx_card_idx
  on public.gift_card_transactions (gift_card_id, created_at desc);
create index if not exists gift_card_tx_order_idx
  on public.gift_card_transactions (order_number) where order_number is not null;

-- What an order had paid by credit, so a refund knows how much to put back.
alter table public.orders
  add column if not exists gift_card_minor bigint not null default 0,
  add column if not exists gift_card_code  text;

alter table public.gift_cards enable row level security;
alter table public.gift_card_transactions enable row level security;

-- Nothing about gift cards is readable from the browser. A card's balance is
-- only ever revealed through a route handler that was given the code.
drop policy if exists gift_cards_no_select on public.gift_cards;
create policy gift_cards_no_select on public.gift_cards for select using (false);
drop policy if exists gift_card_tx_no_select on public.gift_card_transactions;
create policy gift_card_tx_no_select on public.gift_card_transactions for select using (false);

-- ---------------------------------------------------------------------------
-- Redemption.
--
-- The whole reason this is a database function rather than application code:
-- SELECT ... FOR UPDATE takes a row lock, so two checkouts racing on the same
-- card serialise instead of both reading the same balance and both spending it.
-- Doing this in TypeScript — read balance, subtract, write back — is the
-- classic double-spend, and with a gift card it is somebody else's money.
--
-- Returns the amount actually applied, which may be less than requested when
-- the card cannot cover the whole order.
-- ---------------------------------------------------------------------------
create or replace function public.redeem_gift_card(
  p_code         text,
  p_amount_minor bigint,
  p_order_number text
)
returns table (applied_minor bigint, balance_after bigint, card_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  card    gift_cards%rowtype;
  applied bigint;
begin
  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'Redemption amount must be positive';
  end if;

  select * into card
    from gift_cards
   where upper(code) = upper(trim(p_code))
   for update;                              -- the lock that makes this safe

  if not found then
    raise exception 'No such gift card';
  end if;
  if card.status <> 'active' then
    raise exception 'That gift card is %', card.status;
  end if;
  if card.expires_at is not null and card.expires_at < now() then
    update gift_cards set status = 'expired', updated_at = now() where id = card.id;
    raise exception 'That gift card has expired';
  end if;
  if card.balance_minor <= 0 then
    raise exception 'That gift card has no balance left';
  end if;

  -- Spend at most what is on the card.
  applied := least(p_amount_minor, card.balance_minor);

  update gift_cards
     set balance_minor = balance_minor - applied,
         updated_at    = now()
   where id = card.id;

  insert into gift_card_transactions
    (gift_card_id, kind, amount_minor, balance_after, order_number)
  values
    (card.id, 'redeem', -applied, card.balance_minor - applied, p_order_number);

  return query select applied, card.balance_minor - applied, card.id;
end;
$$;

-- Put credit back — an order cancelled or refunded after the card was spent.
create or replace function public.refund_gift_card(
  p_card_id      uuid,
  p_amount_minor bigint,
  p_order_number text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  card gift_cards%rowtype;
  back bigint;
begin
  select * into card from gift_cards where id = p_card_id for update;
  if not found then raise exception 'No such gift card'; end if;

  -- Never restore more than was issued, whatever the caller claims.
  back := least(p_amount_minor, card.initial_minor - card.balance_minor);
  if back <= 0 then return card.balance_minor; end if;

  update gift_cards
     set balance_minor = balance_minor + back,
         status        = case when status = 'expired' then status else 'active' end,
         updated_at    = now()
   where id = card.id;

  insert into gift_card_transactions
    (gift_card_id, kind, amount_minor, balance_after, order_number)
  values
    (card.id, 'refund', back, card.balance_minor + back, p_order_number);

  return card.balance_minor + back;
end;
$$;

revoke all on function public.redeem_gift_card(text, bigint, text) from public, anon, authenticated;
revoke all on function public.refund_gift_card(uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.redeem_gift_card(text, bigint, text) to service_role;
grant execute on function public.refund_gift_card(uuid, bigint, text) to service_role;
