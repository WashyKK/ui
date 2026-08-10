-- ---------------------------------------------------------------------------
-- Back-in-stock alerts
--
-- A Kenyan buyer who needs one specific driver board has no easy local
-- substitute — they cannot just buy it elsewhere this afternoon. Today the
-- product page tells them "Out of stock" and offers nothing, so a real,
-- qualified customer leaves with no way back. This turns that into a lead.
-- ---------------------------------------------------------------------------
create table if not exists public.stock_alerts (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  email       text not null,
  notified_at timestamptz,
  created_at  timestamptz not null default now(),
  -- One open request per person per part; re-subscribing after a notification
  -- is allowed because notified_at makes the rows distinct.
  constraint stock_alerts_unique unique (product_id, email, notified_at)
);

create index if not exists stock_alerts_pending_idx
  on public.stock_alerts (product_id) where notified_at is null;

alter table public.stock_alerts enable row level security;
drop policy if exists stock_alerts_no_select on public.stock_alerts;
create policy stock_alerts_no_select on public.stock_alerts for select using (false);

-- ---------------------------------------------------------------------------
-- Spec attributes
--
-- Buyers arrive knowing 24 V, IP65, NEMA 17, M12, CANopen — not a price band.
-- Those values currently exist only inside PDF datasheets, which Google indexes
-- poorly and this site's own search cannot read at all.
--
-- Normalised rather than a jsonb blob: faceting needs to count distinct values
-- per key, and attribute_keys stops three people inventing "Voltage",
-- "voltage" and "Supply voltage" for the same facet.
-- ---------------------------------------------------------------------------
create table if not exists public.attribute_keys (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  label      text not null,
  unit       text,
  position   integer not null default 0,
  facetable  boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.product_attributes (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  key_id     uuid not null references public.attribute_keys(id) on delete cascade,
  value      text not null,
  created_at timestamptz not null default now(),
  constraint product_attributes_unique unique (product_id, key_id, value)
);

create index if not exists product_attributes_product_idx
  on public.product_attributes (product_id);
create index if not exists product_attributes_key_value_idx
  on public.product_attributes (key_id, value);

alter table public.attribute_keys enable row level security;
alter table public.product_attributes enable row level security;

drop policy if exists attribute_keys_select_all on public.attribute_keys;
create policy attribute_keys_select_all on public.attribute_keys for select using (true);
drop policy if exists product_attributes_select_all on public.product_attributes;
create policy product_attributes_select_all on public.product_attributes for select using (true);

-- A starting vocabulary for this catalogue. Extend it rather than letting free
-- text back in.
insert into public.attribute_keys (key, label, unit, position) values
  ('supply_voltage',   'Supply voltage',      'V',   10),
  ('current_rating',   'Current rating',      'A',   20),
  ('power',            'Power',               'W',   30),
  ('ip_rating',        'IP rating',           null,  40),
  ('output_type',      'Output type',         null,  50),
  ('connection',       'Connection',          null,  60),
  ('protocol',         'Protocol',            null,  70),
  ('mounting',         'Mounting',            null,  80),
  ('frame_size',       'Frame size',          null,  90),
  ('sensing_distance', 'Sensing distance',    'mm', 100),
  ('operating_temp',   'Operating temperature','°C', 110),
  ('certification',    'Certification',       null, 120)
on conflict (key) do nothing;
