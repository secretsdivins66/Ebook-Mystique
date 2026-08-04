#!/usr/bin/env node
/* ============================================================
   ARCANES MYSTIQUES — Générateur de site statique
   ============================================================
   Régénère, à partir de products/products.json et
   data/testimonials.json :
     - une page ebooks/<slug>.html par produit
     - la grille produits dans index.html (marqueurs PRODUCTS)
     - la section témoignages dans index.html (marqueurs TESTIMONIALS)
     - les liens de nav "Témoignages" sur index.html et contact.html
       (marqueurs TESTI-NAV-LI / TESTI-NAV-A, vidés si aucun témoignage)
     - le bloc "Collection" du footer sur index.html et contact.html
       (marqueurs FOOTER-COLLECTION)
     - sitemap.xml

   Ce script est idempotent : on peut le relancer autant de fois que
   nécessaire, y compris pour repasser d'un catalogue non vide à un
   catalogue vide (les marqueurs HTML sont toujours conservés dans le
   fichier de sortie, jamais consommés).

   Usage : node scripts/build.js
   Aucune dépendance npm requise.
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE_URL = 'https://arcanes-mystiques.fr';

const products = JSON.parse(fs.readFileSync(path.join(ROOT, 'products/products.json'), 'utf8'));
const testimonials = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/testimonials.json'), 'utf8'));

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPrice(n) {
  return n.toFixed(2).replace('.', ',') + ' €';
}

/* Replace content between a single start/end marker pair. Markers are
   always preserved in the output so the operation can be repeated. */
function replaceBetween(content, startMarker, endMarker, replacement) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);
  if (start === -1 || end === -1) {
    throw new Error(`Marker not found: ${startMarker} / ${endMarker}`);
  }
  return content.slice(0, start) + startMarker + replacement + endMarker + content.slice(end + endMarker.length);
}

/* Same, but for every occurrence of a marker pair in the file. renderFn
   takes no arguments — it never reads back prior content, so the result
   is always derived fresh from the current data files (fully idempotent). */
function replaceAllBetween(content, startMarker, endMarker, renderFn) {
  let result = '';
  let cursor = 0;
  while (true) {
    const start = content.indexOf(startMarker, cursor);
    if (start === -1) { result += content.slice(cursor); break; }
    const end = content.indexOf(endMarker, start + startMarker.length);
    if (end === -1) throw new Error(`Unmatched marker: ${startMarker}`);
    result += content.slice(cursor, start) + startMarker + renderFn() + endMarker;
    cursor = end + endMarker.length;
  }
  return result;
}

/* ---------- Product card (grid) ---------- */
function renderCard(product, toneIndex, depth) {
  const prefix = depth === 0 ? '' : '../';
  const thumb = product.thumbnail
    ? `<img src="${prefix}${product.thumbnail}" alt="${escapeHtml(product.title)}" loading="lazy" width="600" height="600">`
    : `<div class="product-fallback"><span class="book-mark" aria-hidden="true">${escapeHtml((product.title || '?').charAt(0).toUpperCase())}</span></div>`;

  const priceBlock = product.promoPrice
    ? `<span class="price-current">${formatPrice(product.promoPrice)}</span><span class="price-old">${formatPrice(product.price)}</span>`
    : `<span class="price-current">${formatPrice(product.price)}</span>`;

  return `
        <article class="ebook-card reveal" data-title="${escapeHtml(product.title)}">
          <div class="ebook-cover cover-tone-${toneIndex}">
            ${thumb}
          </div>
          <div class="ebook-body">
            <p class="ebook-category">${escapeHtml(product.category || '')}</p>
            <h3 class="ebook-title">${escapeHtml(product.title)}</h3>
            <p class="ebook-desc">${escapeHtml(product.shortDescription || '')}</p>
            <div class="ebook-footer">
              <div class="ebook-price">
                ${priceBlock}
              </div>
              <a href="${prefix}ebooks/${product.slug}.html" class="btn btn-secondary btn-sm">Découvrir</a>
            </div>
          </div>
        </article>`;
}

/* ---------- index.html : products grid ---------- */
function renderProductsSection() {
  if (products.length === 0) {
    return `
      <div class="empty-state reveal">
        <p class="empty-state-title">La boutique ouvre bientôt</p>
        <p class="empty-state-text">Nos premiers grimoires sont en cours de préparation. Revenez prochainement pour découvrir la collection.</p>
      </div>
    `;
  }
  const cards = products.map((p, i) => renderCard(p, (i % 4) + 1, 0)).join('\n');
  return `
      <div class="ebooks-grid">
${cards}
      </div><!-- /.ebooks-grid -->
    `;
}

/* ---------- footer collection column ---------- */
function renderFooterCollection(depth) {
  if (products.length === 0) return '';
  const prefix = depth === 0 ? '' : '../';
  const items = products.map(p =>
    `            <li><a href="${prefix}ebooks/${p.slug}.html">${escapeHtml(p.title)}</a></li>`
  ).join('\n');
  return `
        <div class="footer-col">
          <h4>Collection</h4>
          <ul role="list">
${items}
          </ul>
        </div>
`;
}

/* ---------- index.html : testimonials section ---------- */
function renderTestimonialsSection() {
  if (testimonials.length === 0) return '';
  const dots = testimonials.map((t, i) =>
    `          <button class="testi-dot${i === 0 ? ' active' : ''}" aria-label="Témoignage ${i + 1}" role="tab"></button>`
  ).join('\n');
  const cards = testimonials.map(t => `
          <div class="testimonial-card">
            <div class="testimonial-inner">
              <div class="quote-icon" aria-hidden="true">&#8220;</div>
              <p class="testimonial-text">
                ${escapeHtml(t.quote)}
              </p>
              <div class="testimonial-author">
                <div class="author-name">${escapeHtml(t.name)}</div>
                <div class="author-title">${escapeHtml(t.role || '')}</div>
              </div>
            </div>
          </div>`).join('\n');

  return `
  <section class="testimonials section" id="temoignages" aria-labelledby="testi-title">
    <div class="container">
      <p class="eyebrow" style="justify-content:center;width:100%;margin-bottom:1rem">Lecteurs</p>
      <h2 class="section-title" id="testi-title">Ce que disent nos lecteurs</h2>
      <p class="section-subtitle">Des retours authentiques de notre communauté</p>

      <div class="testimonials-wrapper" role="region" aria-label="Témoignages">
        <div class="testimonials-track">
${cards}
        </div><!-- /.testimonials-track -->
      </div>

      <div class="testimonials-controls" aria-label="Contrôles du carousel">
        <button class="testi-btn testi-prev" aria-label="Témoignage précédent">&#8592;</button>
        <div class="testi-dots" role="tablist">
${dots}
        </div>
        <button class="testi-btn testi-next" aria-label="Témoignage suivant">&#8594;</button>
      </div>
    </div>
  </section>
`;
}

function testiNavLi(hrefPrefix) {
  return testimonials.length > 0 ? `<li><a href="${hrefPrefix}#temoignages">Témoignages</a></li>` : '';
}

function testiNavA(hrefPrefix) {
  return testimonials.length > 0 ? `<a href="${hrefPrefix}#temoignages">Témoignages</a>` : '';
}

/* Set the footer-grid class deterministically, regardless of its
   current state in the file (idempotent regex substitution). */
function setFooterGridClass(content) {
  const compact = products.length === 0 ? ' footer-grid--compact' : '';
  return content.replace(/class="footer-grid(?: footer-grid--compact)?"/, `class="footer-grid${compact}"`);
}

/* ---------- Product detail page ---------- */
function renderProductPage(product, toneIndex) {
  const url = `${SITE_URL}/ebooks/${product.slug}.html`;
  const metaTitle = (product.seo && product.seo.metaTitle) || `${product.title} — Arcanes Mystiques`;
  const metaDesc = (product.seo && product.seo.metaDescription) || product.shortDescription || '';
  const keywords = (product.seo && product.seo.keywords) || '';

  const banner = product.banner
    ? `<img src="../${product.banner}" alt="${escapeHtml(product.title)}" width="702" height="260" fetchpriority="high">`
    : `<div class="product-fallback"><span class="book-mark-lg" aria-hidden="true">${escapeHtml((product.title || '?').charAt(0).toUpperCase())}</span></div>`;

  const hasPromo = !!product.promoPrice;
  const discountPct = hasPromo ? Math.round((1 - product.promoPrice / product.price) * 100) : 0;
  const priceRow = hasPromo
    ? `<span class="buy-price-current">${formatPrice(product.promoPrice)}</span><span class="buy-price-old">${formatPrice(product.price)}</span><span class="buy-save">−${discountPct} %</span>`
    : `<span class="buy-price-current">${formatPrice(product.price)}</span>`;

  const downloadBtn = product.downloadUrl
    ? `<a href="${escapeHtml(product.downloadUrl)}" class="btn btn-secondary download-btn">Télécharger</a>`
    : `<button class="btn btn-secondary download-btn" disabled aria-disabled="true">Télécharger</button>\n              <p class="download-note">Disponible après achat</p>`;

  const fullDescParagraphs = Array.isArray(product.fullDescription)
    ? product.fullDescription
    : String(product.fullDescription || '').split(/\n\n+/).filter(Boolean);
  const fullDescHtml = fullDescParagraphs.map(p => `        <p>${escapeHtml(p)}</p>`).join('\n');

  const descriptionSection = fullDescHtml ? `
  <section class="product-description-section section">
    <div class="container" style="max-width:820px">
      <h2 class="section-title" style="text-align:left">Description</h2>
      <div class="product-full-description">
${fullDescHtml}
      </div>
    </div>
  </section>
` : '';

  const gallery = Array.isArray(product.gallery) ? product.gallery : [];
  const gallerySection = gallery.length ? `
  <section class="product-gallery-section" aria-label="Galerie">
    <div class="container">
      <h2 class="section-title" style="text-align:left">Galerie</h2>
      <div class="product-gallery">
${gallery.map(src => `        <div class="product-gallery-item"><img src="../${src}" alt="${escapeHtml(product.title)}" loading="lazy" width="600" height="600"></div>`).join('\n')}
      </div>
    </div>
  </section>
` : '';

  const related = products
    .filter(p => p.slug !== product.slug && p.category === product.category)
    .concat(products.filter(p => p.slug !== product.slug && p.category !== product.category))
    .slice(0, 3);

  const relatedSection = related.length ? `
  <section class="related-ebooks" aria-labelledby="related-title">
    <div class="container">
      <h2 class="section-title" id="related-title">Vous pourriez aussi aimer</h2>
      <div class="ebooks-grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
${related.map((p, i) => renderCard(p, (i % 4) + 1, 1)).join('\n')}
      </div>
    </div>
  </section>
` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(metaDesc)}">
  ${keywords ? `<meta name="keywords" content="${escapeHtml(keywords)}">\n  ` : ''}<meta property="og:title" content="${escapeHtml(metaTitle)}">
  <meta property="og:description" content="${escapeHtml(metaDesc)}">
  <meta property="og:type" content="product">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="Arcanes Mystiques">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(metaTitle)}">
  <meta name="twitter:description" content="${escapeHtml(metaDesc)}">
  <meta name="theme-color" content="#09080f">
  <link rel="canonical" href="${url}">
  <link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
  <title>${escapeHtml(metaTitle)}</title>
  <link rel="stylesheet" href="../css/style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Raleway:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": ${JSON.stringify(product.title)},
    "description": ${JSON.stringify(product.shortDescription || '')},
    "category": ${JSON.stringify(product.category || '')},
    "offers": {
      "@type": "Offer",
      "price": "${(hasPromo ? product.promoPrice : product.price).toFixed(2)}",
      "priceCurrency": "EUR",
      "availability": "https://schema.org/InStock",
      "url": "${url}"
    }
  }
  </script>
</head>
<body>

  <a href="#main-content" class="skip-link">Aller au contenu principal</a>

  <nav class="navbar" role="navigation" aria-label="Navigation principale">
    <div class="nav-container">
      <a href="../index.html" class="nav-logo" aria-label="Retour à l'accueil">Arcanes Mystiques</a>
      <ul class="nav-links" role="list">
        <li><a href="../index.html">Accueil</a></li>
        <li><a href="../index.html#ebooks" class="active">Ebooks</a></li>
        ${testiNavLi('../index.html')}
        <li><a href="../index.html#faq">FAQ</a></li>
        <li><a href="../contact.html">Contact</a></li>
      </ul>
      <a href="../index.html#ebooks" class="btn btn-secondary btn-sm nav-cta">Tous les ebooks</a>
      <button class="hamburger" aria-label="Ouvrir le menu"><span></span><span></span><span></span></button>
    </div>
  </nav>

  <nav class="nav-overlay">
    <button class="overlay-close" aria-label="Fermer">Fermer</button>
    <a href="../index.html">Accueil</a>
    <a href="../index.html#ebooks">Ebooks</a>
    ${testiNavA('../index.html')}
    <a href="../index.html#faq">FAQ</a>
    <a href="../contact.html">Contact</a>
  </nav>

  <section class="ebook-detail-hero" id="main-content">
    <div class="container">
      <div class="product-banner-frame">
        ${banner}
      </div>

      <div class="product-hero-grid">
        <div class="ebook-detail-info">
          <p class="ebook-detail-category">${escapeHtml(product.category || '')}</p>
          <h1>${escapeHtml(product.title)}</h1>
          <p class="ebook-detail-desc">${escapeHtml(product.shortDescription || '')}</p>
        </div>

        <div class="buy-box" data-title="${escapeHtml(product.title)}">
          <div class="buy-price-row">
            ${priceRow}
          </div>
          <div class="buy-btns">
            <button class="btn btn-primary btn-buy" data-title="${escapeHtml(product.title)}">Acheter maintenant</button>
            ${downloadBtn}
          </div>
        </div>
      </div>
    </div>
  </section>
${descriptionSection}${gallerySection}${relatedSection}
  <footer class="footer" role="contentinfo">
    <div class="container">
      <div class="footer-bottom" style="border:none;padding-top:0">
        <a href="../index.html" class="nav-logo" style="font-size:1rem">Arcanes Mystiques</a>
        <span style="color:var(--text-muted);font-size:0.82rem">© 2026 Arcanes Mystiques. Tous droits réservés.</span>
        <span style="font-size:0.82rem"><a href="#">Mentions légales</a> · <a href="#">Confidentialité</a></span>
      </div>
    </div>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
  <script src="../js/main.js"></script>
</body>
</html>
`;
}

/* ---------- Run ---------- */

// 1. Clean and regenerate ebooks/*.html
const ebooksDir = path.join(ROOT, 'ebooks');
fs.rmSync(ebooksDir, { recursive: true, force: true });
fs.mkdirSync(ebooksDir, { recursive: true });

const slugs = new Set();
products.forEach((p, i) => {
  if (slugs.has(p.slug)) throw new Error(`Duplicate product slug: ${p.slug}`);
  slugs.add(p.slug);
  const html = renderProductPage(p, (i % 4) + 1);
  fs.writeFileSync(path.join(ebooksDir, `${p.slug}.html`), html);
});

// 2. index.html
let indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
indexHtml = replaceBetween(indexHtml, '<!-- PRODUCTS:START -->', '<!-- PRODUCTS:END -->', renderProductsSection());
indexHtml = replaceBetween(indexHtml, '<!-- TESTIMONIALS:START -->', '<!-- TESTIMONIALS:END -->', renderTestimonialsSection());
indexHtml = replaceBetween(indexHtml, '<!-- FOOTER-COLLECTION:START -->', '<!-- FOOTER-COLLECTION:END -->', renderFooterCollection(0));
indexHtml = replaceAllBetween(indexHtml, '<!--TESTI-NAV-LI-->', '<!--/TESTI-NAV-LI-->', () => testiNavLi(''));
indexHtml = replaceAllBetween(indexHtml, '<!--TESTI-NAV-A-->', '<!--/TESTI-NAV-A-->', () => testiNavA(''));
indexHtml = setFooterGridClass(indexHtml);
fs.writeFileSync(path.join(ROOT, 'index.html'), indexHtml);

// 3. contact.html
let contactHtml = fs.readFileSync(path.join(ROOT, 'contact.html'), 'utf8');
contactHtml = replaceBetween(contactHtml, '<!-- FOOTER-COLLECTION:START -->', '<!-- FOOTER-COLLECTION:END -->', renderFooterCollection(0));
contactHtml = replaceAllBetween(contactHtml, '<!--TESTI-NAV-LI-->', '<!--/TESTI-NAV-LI-->', () => testiNavLi('index.html'));
contactHtml = replaceAllBetween(contactHtml, '<!--TESTI-NAV-A-->', '<!--/TESTI-NAV-A-->', () => testiNavA('index.html'));
contactHtml = setFooterGridClass(contactHtml);
fs.writeFileSync(path.join(ROOT, 'contact.html'), contactHtml);

// 4. sitemap.xml
const staticUrls = [
  { loc: `${SITE_URL}/`, changefreq: 'weekly', priority: '1.0' },
  { loc: `${SITE_URL}/contact.html`, changefreq: 'monthly', priority: '0.5' },
];
const productUrls = products.map(p => ({
  loc: `${SITE_URL}/ebooks/${p.slug}.html`,
  changefreq: 'monthly',
  priority: '0.8',
}));
const allUrls = staticUrls.concat(productUrls);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

console.log(`Build terminé : ${products.length} produit(s), ${testimonials.length} témoignage(s).`);
