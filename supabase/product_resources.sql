-- Everything a technical buyer needs on a product page beyond one photo and one PDF.
--
-- product_images already exists (catalog_depth.sql). This adds the other three
-- collections: multiple titled documents, links to useful resources, and code
-- snippets showing how to actually drive the part.
--
-- In each case the existing single column stays as the primary — image_url is
-- the thumbnail, datasheet_url is the headline datasheet — so nothing that
-- reads them breaks and the grid still has one image and one PDF to show.

-- ---------------------------------------------------------------------------
-- Documents
--
-- One datasheet is rarely the whole story: there is a datasheet, a user manual,
-- a CAD drawing, a CE/RoHS certificate, an application note. Titling them
-- matters — "PDF" tells a buyer nothing about which of the five it is.
-- ---------------------------------------------------------------------------
create table if not exists public.product_documents (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url        text not null,
  title      text not null,
  kind       text not null default 'datasheet',
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.product_documents
  drop constraint if exists product_documents_kind_check,
  add constraint product_documents_kind_check check (kind in (
    'datasheet', 'manual', 'drawing', 'certificate', 'application_note', 'other'
  ));

create index if not exists product_documents_product_idx
  on public.product_documents (product_id, position);

-- ---------------------------------------------------------------------------
-- Links
--
-- The manufacturer's product page, a GitHub library, a wiring guide, a video.
-- Held separately from documents because these are not ours and are not files:
-- deleting one frees nothing, and they can rot.
-- ---------------------------------------------------------------------------
create table if not exists public.product_links (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  url         text not null,
  title       text not null,
  description text,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists product_links_product_idx
  on public.product_links (product_id, position);

-- ---------------------------------------------------------------------------
-- Code snippets
--
-- The difference between selling a sensor and selling a sensor someone can use
-- this afternoon. A wiring snippet or a five-line read loop answers the support
-- email before it is written.
-- ---------------------------------------------------------------------------
create table if not exists public.product_snippets (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  title       text not null,
  language    text not null default 'text',
  code        text not null,
  description text,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists product_snippets_product_idx
  on public.product_snippets (product_id, position);

-- ---------------------------------------------------------------------------
-- Read-only to the public, like products and product_images. Writes go through
-- a route handler that has already checked the caller.
-- ---------------------------------------------------------------------------
alter table public.product_documents enable row level security;
alter table public.product_links     enable row level security;
alter table public.product_snippets  enable row level security;

drop policy if exists product_documents_select_all on public.product_documents;
create policy product_documents_select_all on public.product_documents for select using (true);

drop policy if exists product_links_select_all on public.product_links;
create policy product_links_select_all on public.product_links for select using (true);

drop policy if exists product_snippets_select_all on public.product_snippets;
create policy product_snippets_select_all on public.product_snippets for select using (true);

-- Carry the existing single datasheet across so nothing has to be re-uploaded.
insert into public.product_documents (product_id, url, title, kind, position)
select p.id, p.datasheet_url, 'Datasheet', 'datasheet', 0
  from public.products p
 where p.datasheet_url is not null
   and not exists (
     select 1 from public.product_documents d
      where d.product_id = p.id and d.url = p.datasheet_url
   );
