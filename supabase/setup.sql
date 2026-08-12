-- ============================================================
-- Livre Mystique — Configuration de la base de données
-- ============================================================
-- À exécuter une seule fois dans : Supabase Dashboard → SQL Editor → New query
-- Copie-colle tout ce fichier, puis clique sur "Run".
-- Ce script est idempotent : tu peux le relancer sans risque.
-- ============================================================

-- ---------- 1. Table des produits ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  short_description text not null default '',
  full_description text not null default '',
  category text not null default '',
  price numeric(10,2) not null default 0,
  promo_price numeric(10,2),
  thumbnail_url text,
  banner_url text,
  gallery jsonb not null default '[]'::jsonb,
  pdf_path text,
  seo_meta_title text,
  seo_meta_description text,
  seo_keywords text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_status_idx on public.products (status);
create index if not exists products_slug_idx on public.products (slug);

-- Met à jour updated_at automatiquement à chaque modification
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
for each row execute function public.set_updated_at();

-- ---------- 2. Sécurité (Row Level Security) ----------
alter table public.products enable row level security;

drop policy if exists "Public can view published products" on public.products;
create policy "Public can view published products"
on public.products for select
to anon
using (status = 'published');

drop policy if exists "Authenticated can view all products" on public.products;
create policy "Authenticated can view all products"
on public.products for select
to authenticated
using (true);

drop policy if exists "Authenticated can insert products" on public.products;
create policy "Authenticated can insert products"
on public.products for insert
to authenticated
with check (true);

drop policy if exists "Authenticated can update products" on public.products;
create policy "Authenticated can update products"
on public.products for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can delete products" on public.products;
create policy "Authenticated can delete products"
on public.products for delete
to authenticated
using (true);

-- ---------- 3. Stockage des fichiers ----------
-- Bucket public : vignettes, bannières, galerie (doivent être visibles sur la boutique)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Bucket privé : fichiers PDF des ebooks (jamais accessibles publiquement)
insert into storage.buckets (id, name, public)
values ('product-files', 'product-files', false)
on conflict (id) do nothing;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
on storage.objects for select
to anon
using (bucket_id = 'product-images');

drop policy if exists "Authenticated can manage product images" on storage.objects;
create policy "Authenticated can manage product images"
on storage.objects for all
to authenticated
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');

drop policy if exists "Authenticated can view product files" on storage.objects;
create policy "Authenticated can view product files"
on storage.objects for select
to authenticated
using (bucket_id = 'product-files');

drop policy if exists "Authenticated can manage product files" on storage.objects;
create policy "Authenticated can manage product files"
on storage.objects for all
to authenticated
using (bucket_id = 'product-files')
with check (bucket_id = 'product-files');

-- ============================================================
-- Terminé. Étape suivante : crée ton compte administrateur
-- (voir SUPABASE-SETUP.md, section 2).
-- ============================================================
