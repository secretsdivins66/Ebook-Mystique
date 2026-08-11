# Paiement Chariow + livraison des ebooks — à faire une seule fois

Le code est en place, mais il reste des étapes manuelles obligatoires avant
qu'un client puisse réellement payer et recevoir un ebook. Comme pour
`SUPABASE-SETUP.md`, chaque étape se fait depuis un tableau de bord — aucune
clé sensible n'a besoin d'être partagée avec qui que ce soit d'autre que toi.

> Le domaine réel du site est **`livremystique.com`** (redirige vers
> `www.livremystique.com`) — corrigé le 2026-08-12 partout où
> `arcanes-mystiques.fr` (jamais un vrai domaine, ne résolvait pas) était
> utilisé par erreur dans ce projet.

## 1. Exécuter la migration SQL

1. [Tableau de bord Supabase](https://supabase.com/dashboard) → ce projet
   (`cawyrfbmwpcoanftybew`) → **SQL Editor** → **New query**.
2. Copie-colle tout le contenu de
   [`supabase/chariow-setup.sql`](supabase/chariow-setup.sql), clique **Run**.

Ça ajoute la colonne `chariow_product_id` à `products`, et deux nouvelles
tables (`orders`, `downloads`) pour suivre les achats et les liens de
téléchargement.

## 2. Créer un produit Chariow pour chaque ebook à vendre

Chariow n'a pas d'API pour créer un produit — ça se fait à la main :

1. [app.chariow.com](https://app.chariow.com) → **Produits** → nouveau
   produit.
2. **Même compte/boutique que Secret Divin** (confirmé le 2026-08-12).
3. Prix et **devise = EUR**, exactement le même prix que celui renseigné
   dans l'admin du site pour cet ebook (prix promo si il y en a un — c'est
   toujours le prix promo qui est facturé en priorité s'il existe).
4. Une fois créé, copie son identifiant (`prd_...`) et colle-le dans le champ
   **"Identifiant produit Chariow"** du formulaire produit, dans l'admin de
   ce site (`/admin/product-form.html`).

Répète cette étape à chaque nouvel ebook ajouté — c'est la seule partie
répétitive, propre aux limites de l'API Chariow (déjà rencontrée sur Secret
Divin).

## 3. Créer une Pulse (webhook) dédiée à ce site

Chariow supporte plusieurs Pulses indépendantes par boutique, chacune avec
sa propre URL et son propre secret — donc **ne réutilise pas** celle de
Secret Divin, crée-en une nouvelle rien que pour ce site :

1. app.chariow.com → **Automations** → **Pulses** → **Add Pulse**.
2. URL du Pulse :
   ```
   https://www.livremystique.com/api/chariow-webhook
   ```
3. Événement à écouter : `successful.sale`.
4. Une fois créée, Chariow affiche un secret de signature (`whsec_...`) —
   garde-le, tu en auras besoin à l'étape 5.

## 4. Créer un compte Resend (envoi des emails de livraison)

1. [resend.com](https://resend.com) → créer un compte.
2. **Vérifier le domaine `livremystique.com`** (le vrai domaine du site —
   voir la note en tête de ce document) : Resend → Domains → Add Domain →
   suit les instructions (ajouter les enregistrements DNS fournis chez ton
   hébergeur de domaine). Sans ce domaine vérifié, l'envoi échouera —
   l'adresse d'expéditeur configurée dans le code est
   `noreply@livremystique.com`.
3. Resend → API Keys → créer une clé, la garder pour l'étape 5.

## 5. Renseigner les variables d'environnement sur Vercel

Sur le tableau de bord Vercel du projet (compte différent de Secret Divin —
voir la note dans la mémoire du projet) → **Settings** →
**Environment Variables**, ajoute ces 4 variables (Production, et Preview
si tu veux tester avant de pousser en prod) :

| Variable | Valeur |
|---|---|
| `CHARIOW_API_KEY` | La même clé API Chariow que Secret Divin (même compte) |
| `CHARIOW_WEBHOOK_SECRET` | Le secret de la Pulse créée à l'étape 3 (`whsec_...`) |
| `RESEND_API_KEY` | La clé créée à l'étape 4 |
| `SUPABASE_SERVICE_ROLE_KEY` | Tableau de bord Supabase → Settings → API → `service_role` |

Après les avoir ajoutées, redéploie le projet (un nouveau push suffit, ou
"Redeploy" depuis le tableau de bord Vercel) pour qu'elles soient prises en
compte.

## Une fois tout ça fait

Le flux complet est : un visiteur clique "Acheter maintenant" sur la fiche
d'un ebook → renseigne prénom/nom/email/téléphone → est redirigé vers le
paiement Chariow → une fois payé, reçoit par email (Resend) un lien de
téléchargement sécurisé (valable 30 jours, 5 téléchargements max) qui pointe
vers le PDF stocké en privé sur Supabase.

**Rien de tout ça n'a encore été testé en conditions réelles** (aucun accès
direct à ce Supabase/Vercel/Chariow depuis mon environnement pour le
vérifier moi-même, contrairement à Secret Divin) — une fois les 5 étapes
ci-dessus faites, fais un vrai petit achat test (ou dis-le moi et je peux
t'aider à vérifier étape par étape avec toi si tu me donnes un accès
temporaire).
