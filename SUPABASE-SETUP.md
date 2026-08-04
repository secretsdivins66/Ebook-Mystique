# Configuration Supabase — à faire une seule fois

L'administration du site (connexion, gestion des produits, stockage des images
et des PDF) repose sur ton projet Supabase déjà connecté au site
(`kaujtphylrcautstokzw.supabase.co`). Ces trois étapes se font entièrement
depuis le tableau de bord Supabase — aucune clé sensible n'a besoin d'être
partagée avec qui que ce soit.

## 1. Créer la table produits, la sécurité et le stockage

1. Ouvre [ton tableau de bord Supabase](https://supabase.com/dashboard).
2. Va dans **SQL Editor** (menu de gauche) → **New query**.
3. Ouvre le fichier [`supabase/setup.sql`](supabase/setup.sql) de ce dépôt,
   copie tout son contenu, colle-le dans l'éditeur SQL.
4. Clique sur **Run**.

Cela crée :
- la table `products` avec tous les champs nécessaires,
- les règles de sécurité (Row Level Security) : le public ne peut voir que les
  produits "publiés", seul un administrateur connecté peut créer/modifier/supprimer,
- deux espaces de stockage : `product-images` (public, pour les vignettes/bannières/galerie)
  et `product-files` (privé, pour les PDF).

Le script peut être relancé sans risque si besoin.

## 2. Créer ton compte administrateur

1. Dans le tableau de bord Supabase, va dans **Authentication** → **Users**.
2. Clique sur **Add user** → **Create new user**.
3. Renseigne ton email et un mot de passe fort (c'est ce que tu utiliseras
   pour te connecter à `/admin/login.html`).
4. Décoche/ignore l'envoi d'email de confirmation si l'option apparaît, ou
   confirme l'utilisateur manuellement (bouton "Confirm user" s'il existe) —
   l'important est que le compte soit actif immédiatement.

Tu peux créer plusieurs comptes de cette façon si plusieurs personnes doivent
administrer la boutique. Pour révoquer un accès, supprime l'utilisateur
correspondant dans cette même page.

## 3. Se connecter

Une fois les deux étapes ci-dessus terminées, rends-toi sur :

```
https://ebook-mystique.vercel.app/admin/login.html
```

et connecte-toi avec l'email et le mot de passe créés à l'étape 2.

## Notes de sécurité

- La page `/admin/` est accessible publiquement (comme toute page d'un site
  statique) mais **aucune donnée n'est accessible sans authentification** :
  la sécurité est appliquée côté base de données (Row Level Security), pas
  seulement côté interface. Un visiteur qui arrive sur `/admin/` sans être
  connecté est immédiatement redirigé vers la page de connexion et ne peut
  lire ni modifier aucun produit.
- Les fichiers PDF ne sont jamais exposés publiquement : ils sont stockés
  dans un espace privé, seul un administrateur connecté peut y accéder.
- `/admin/` est exclu de l'indexation par les moteurs de recherche
  (`robots.txt`).
