# Ajouter un produit

La boutique est pilotée par un seul fichier de données : `products/products.json`.
Chaque produit devient automatiquement une page dans `ebooks/`, une carte sur la
page d'accueil, une entrée dans le footer et une ligne dans `sitemap.xml`.

## 1. Ajouter les images (facultatif mais recommandé)

Crée un dossier pour le produit dans `assets/products/<slug>/` et déposes-y :

- `thumbnail.jpg` — vignette carrée, **minimum 600 × 600 px** (utilisée sur la page
  d'accueil et dans les listes de produits liés)
- `banner.jpg` — bannière large, **minimum 702 × 260 px** (utilisée en haut de la
  page produit)
- `gallery-1.jpg`, `gallery-2.jpg`, ... — images supplémentaires (galerie du produit)

Si tu n'as pas encore d'images, laisse ces champs vides (`""` ou `[]`) — le site
affiche automatiquement un monogramme typographique à la place, sans casser la mise
en page.

## 2. Décrire le produit

Ouvre `products/products.json` et ajoute un objet à la liste (le fichier commence
vide : `[]`) :

```json
{
  "slug": "mon-nouvel-ebook",
  "title": "Titre du produit",
  "shortDescription": "Une phrase courte affichée sur la carte et en haut de la page produit.",
  "fullDescription": "Premier paragraphe.\n\nDeuxième paragraphe.",
  "category": "Catégorie",
  "price": 19.99,
  "promoPrice": null,
  "thumbnail": "assets/products/mon-nouvel-ebook/thumbnail.jpg",
  "banner": "assets/products/mon-nouvel-ebook/banner.jpg",
  "gallery": [
    "assets/products/mon-nouvel-ebook/gallery-1.jpg"
  ],
  "downloadUrl": "",
  "seo": {
    "metaTitle": "Titre du produit — Arcanes Mystiques",
    "metaDescription": "Description pour les moteurs de recherche (150-160 caractères).",
    "keywords": "mot-clé 1, mot-clé 2"
  }
}
```

Champs :

| Champ              | Obligatoire | Description                                                              |
|---------------------|:-----------:|----------------------------------------------------------------------------|
| `slug`              | oui         | Identifiant unique, utilisé dans l'URL (`ebooks/<slug>.html`). Sans espaces/accents. |
| `title`             | oui         | Titre affiché.                                                             |
| `shortDescription`  | oui         | Description courte.                                                        |
| `fullDescription`   | oui         | Description complète. Sépare les paragraphes par une ligne vide (`\n\n`).  |
| `category`          | oui         | Catégorie affichée, utilisée aussi pour suggérer des produits liés.        |
| `price`             | oui         | Prix normal (nombre, ex. `19.99`).                                         |
| `promoPrice`        | non         | Prix promotionnel. Laisser à `null` si aucune promotion.                   |
| `thumbnail`         | non         | Chemin vers la vignette (min. 600×600 px).                                 |
| `banner`             | non         | Chemin vers la bannière (min. 702×260 px).                                 |
| `gallery`            | non         | Liste de chemins d'images supplémentaires.                                 |
| `downloadUrl`        | non         | Lien de téléchargement post-achat. Laisser vide tant qu'il n'y a pas de système de paiement réel : le bouton « Télécharger » s'affiche alors désactivé avec la mention « Disponible après achat ». |
| `seo.metaTitle`      | non         | Titre `<title>` / Open Graph. Par défaut : `{title} — Arcanes Mystiques`.  |
| `seo.metaDescription`| non         | Meta description. Par défaut : `shortDescription`.                        |
| `seo.keywords`       | non         | Mots-clés SEO.                                                             |

## 3. Générer le site

```bash
node scripts/build.js
```

Ce script régénère automatiquement :

- `ebooks/<slug>.html` pour chaque produit
- la grille produits de `index.html`
- le bloc « Collection » du footer
- `sitemap.xml`

Il peut être relancé autant de fois que nécessaire (y compris pour revenir à un
catalogue vide) : il ne dépend d'aucune dépendance npm.

## 4. Publier

```bash
git add -A
git commit -m "Ajoute le produit <titre>"
git push
```

Vercel déploie automatiquement la nouvelle version.

## Témoignages (facultatif)

`data/testimonials.json` fonctionne sur le même principe : liste vide par défaut
(la section « Ce que disent nos lecteurs » est alors masquée automatiquement),
ou liste d'objets `{ "quote": "...", "name": "...", "role": "..." }`. Relancer
`node scripts/build.js` après modification.
