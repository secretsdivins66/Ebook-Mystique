-- ============================================================
-- Arcanes Mystiques — paiement Chariow + livraison des ebooks
-- ============================================================
-- À exécuter une seule fois dans : Supabase Dashboard → SQL Editor → New query
-- (même procédure que setup.sql — voir SUPABASE-SETUP.md).
-- Ce script est idempotent : tu peux le relancer sans risque.
--
-- Contexte : le site n'avait jusqu'ici aucun système de paiement (le
-- bouton "Télécharger" était volontairement désactivé, voir api/product.js).
-- Ce script ajoute ce qu'il faut pour vendre réellement via Chariow :
-- - products.chariow_product_id : l'identifiant du produit Chariow
--   correspondant à cet ebook (créé à la main sur app.chariow.com pour
--   chaque ebook, aucune API de création de produit n'existe côté
--   Chariow — voir admin/product-form.html pour où le renseigner).
-- - orders : une ligne par tentative d'achat (créée au checkout, mise à
--   jour par le webhook quand Chariow confirme la vente).
-- - downloads : le lien de téléchargement sécurisé envoyé par email après
--   un achat confirmé — jeton aléatoire, expire après 30 jours, 5
--   téléchargements maximum (reprend exactement la promesse déjà faite
--   dans la FAQ du site).
-- ============================================================

alter table public.products add column if not exists chariow_product_id text;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  buyer_email text not null,
  buyer_first_name text not null,
  buyer_last_name text not null,
  amount numeric(10,2) not null,
  currency text not null default 'EUR',
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  internal_reference text unique not null,
  chariow_sale_id text,
  pulse_delivery_id text unique,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_product_id_idx on public.orders (product_id);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  token text unique not null,
  max_downloads integer not null default 5,
  download_count integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists downloads_token_idx on public.downloads (token);

-- Sécurité : ces deux tables contiennent des données d'achat (email,
-- montant) et le jeton de téléchargement — aucune policy publique, comme
-- product-files. Seul service_role (utilisé par les fonctions Vercel
-- api/chariow-checkout.js, api/chariow-webhook.js, api/download.js, qui
-- contourne RLS) y accède. Ni anon ni authenticated n'ont de policy ici
-- volontairement : un acheteur n'a pas de compte sur ce site (achat
-- anonyme, identifié seulement par son email + le jeton reçu par mail).
alter table public.orders enable row level security;
alter table public.downloads enable row level security;

-- ============================================================
-- Terminé. Étapes suivantes (voir CHARIOW-SETUP.md) :
-- 1. Créer un produit Chariow (EUR) pour chaque ebook à vendre, coller
--    son product_id dans le champ correspondant du formulaire admin.
-- 2. Créer une nouvelle Pulse (Automations → Pulses) sur app.chariow.com
--    pointant vers https://www.livremystique.com/api/chariow-webhook,
--    récupérer son secret de signature.
-- 3. Renseigner les variables d'environnement sur Vercel (voir
--    CHARIOW-SETUP.md) : CHARIOW_API_KEY, CHARIOW_WEBHOOK_SECRET,
--    RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY.
-- ============================================================
