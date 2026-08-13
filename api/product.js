const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://cawyrfbmwpcoanftybew.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhd3lyZmJtd3Bjb2FuZnR5YmV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MjQxNDcsImV4cCI6MjA5NjUwMDE0N30.sMq_LhdpFpKTMCVXgIkDV-w5Zw8jBUktedj31b2q2dE';
// Domaine réel confirmé en direct le 2026-08-12 (voir chariow-checkout.js/
// chariow-webhook.mjs) — "arcanes-mystiques.fr" ne résolvait pas.
const SITE_URL = 'https://www.livremystique.com';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPrice(n) {
  return Math.round(Number(n)).toLocaleString('fr-FR') + ' FCFA';
}

function renderCard(p, toneIndex) {
  const thumb = p.thumbnail_url
    ? `<img src="${escapeHtml(p.thumbnail_url)}" alt="${escapeHtml(p.title)}" loading="lazy" width="600" height="600">`
    : `<div class="product-fallback"><span class="book-mark" aria-hidden="true">${escapeHtml((p.title || '?').charAt(0).toUpperCase())}</span></div>`;
  const priceBlock = p.promo_price
    ? `<span class="price-current">${formatPrice(p.promo_price)}</span><span class="price-old">${formatPrice(p.price)}</span>`
    : `<span class="price-current">${formatPrice(p.price)}</span>`;
  return `
        <article class="ebook-card reveal" data-title="${escapeHtml(p.title)}">
          <div class="ebook-cover cover-tone-${toneIndex}">${thumb}</div>
          <div class="ebook-body">
            <p class="ebook-category">${escapeHtml(p.category)}</p>
            <h3 class="ebook-title">${escapeHtml(p.title)}</h3>
            <p class="ebook-desc">${escapeHtml(p.short_description)}</p>
            <div class="ebook-footer">
              <div class="ebook-price">${priceBlock}</div>
              <a href="../ebooks/${escapeHtml(p.slug)}" class="btn btn-secondary btn-sm">Découvrir</a>
            </div>
          </div>
        </article>`;
}

function notFoundPage() {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex">
  <title>Produit introuvable — Livre Mystique</title>
  <link rel="stylesheet" href="/css/style.css">
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
</head>
<body>
  <a href="#main-content" class="skip-link">Aller au contenu principal</a>
  <header class="page-hero" role="banner" id="main-content">
    <div>
      <h1>Produit introuvable</h1>
      <p>Ce produit n'existe pas ou n'est plus disponible. <a href="/index.html#ebooks">Retourner à la boutique</a>.</p>
    </div>
  </header>
</body>
</html>`;
}

module.exports = async (req, res) => {
  const slug = (req.query.slug || '').toString();

  if (!slug) {
    res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(notFoundPage());
    return;
  }

  const { data: product, error } = await sb
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !product) {
    res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(notFoundPage());
    return;
  }

  const { data: relatedRaw } = await sb
    .from('products')
    .select('slug, title, category, price, promo_price, thumbnail_url')
    .eq('status', 'published')
    .neq('slug', slug)
    .limit(6);

  const related = (relatedRaw || [])
    .sort((a, b) => (a.category === product.category ? -1 : 0) - (b.category === product.category ? -1 : 0))
    .slice(0, 3);

  const url = `${SITE_URL}/ebooks/${product.slug}`;
  const metaTitle = product.seo_meta_title || `${product.title} — Livre Mystique`;
  const metaDesc = product.seo_meta_description || product.short_description || '';
  const keywords = product.seo_keywords || '';

  const banner = product.banner_url
    ? `<img src="${escapeHtml(product.banner_url)}" alt="${escapeHtml(product.title)}" width="702" height="260" fetchpriority="high">`
    : `<div class="product-fallback"><span class="book-mark-lg" aria-hidden="true">${escapeHtml((product.title || '?').charAt(0).toUpperCase())}</span></div>`;

  const hasPromo = !!product.promo_price;
  const discountPct = hasPromo ? Math.round((1 - product.promo_price / product.price) * 100) : 0;
  const priceRow = hasPromo
    ? `<span class="buy-price-current">${formatPrice(product.promo_price)}</span><span class="buy-price-old">${formatPrice(product.price)}</span><span class="buy-save">−${discountPct} %</span>`
    : `<span class="buy-price-current">${formatPrice(product.price)}</span>`;

  // Paiement Chariow branché (voir api/chariow-checkout.js/chariow-webhook.mjs) :
  // plus de bouton "Télécharger" ici, la livraison se fait par email
  // (lien sécurisé) après confirmation du paiement, pas depuis cette page.
  const downloadBtn = `<p class="download-note">Livraison immédiate par email après paiement</p>`;

  const fullDescParagraphs = String(product.full_description || '').split(/\n\n+/).filter(Boolean);
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
${gallery.map(src => `        <div class="product-gallery-item"><img src="${escapeHtml(src)}" alt="${escapeHtml(product.title)}" loading="lazy" width="600" height="600"></div>`).join('\n')}
      </div>
    </div>
  </section>
` : '';

  const relatedSection = related.length ? `
  <section class="related-ebooks" aria-labelledby="related-title">
    <div class="container">
      <h2 class="section-title" id="related-title">Vous pourriez aussi aimer</h2>
      <div class="ebooks-grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
${related.map((p, i) => renderCard(p, (i % 4) + 1)).join('\n')}
      </div>
    </div>
  </section>
` : '';

  const html = `<!DOCTYPE html>
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
  <meta property="og:site_name" content="Livre Mystique">
  ${product.thumbnail_url ? `<meta property="og:image" content="${escapeHtml(product.thumbnail_url)}">\n  ` : ''}<meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(metaTitle)}">
  <meta name="twitter:description" content="${escapeHtml(metaDesc)}">
  <meta name="theme-color" content="#09080f">
  <link rel="canonical" href="${url}">
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
  <title>${escapeHtml(metaTitle)}</title>
  <link rel="stylesheet" href="/css/style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Raleway:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": ${JSON.stringify(product.title)},
    "description": ${JSON.stringify(product.short_description || '')},
    "category": ${JSON.stringify(product.category || '')},
    "offers": {
      "@type": "Offer",
      "price": "${Math.round(hasPromo ? product.promo_price : product.price)}",
      "priceCurrency": "XOF",
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
      <a href="/index.html" class="nav-logo" aria-label="Retour à l'accueil">Livre Mystique</a>
      <ul class="nav-links" role="list">
        <li><a href="/index.html">Accueil</a></li>
        <li><a href="/index.html#ebooks" class="active">Ebooks</a></li>
        <li><a href="/index.html#faq">FAQ</a></li>
        <li><a href="/contact.html">Contact</a></li>
      </ul>
      <a href="/index.html#ebooks" class="btn btn-secondary btn-sm nav-cta">Tous les ebooks</a>
      <button class="hamburger" aria-label="Ouvrir le menu"><span></span><span></span><span></span></button>
    </div>
  </nav>

  <nav class="nav-overlay">
    <button class="overlay-close" aria-label="Fermer">Fermer</button>
    <a href="/index.html">Accueil</a>
    <a href="/index.html#ebooks">Ebooks</a>
    <a href="/index.html#faq">FAQ</a>
    <a href="/contact.html">Contact</a>
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
          <p class="ebook-detail-desc">${escapeHtml(product.short_description || '')}</p>
        </div>

        <div class="buy-box" data-title="${escapeHtml(product.title)}">
          <div class="buy-price-row">
            ${priceRow}
          </div>
          <div class="buy-btns">
            <button class="btn btn-primary btn-buy" data-title="${escapeHtml(product.title)}" data-slug="${escapeHtml(product.slug)}">Acheter maintenant</button>
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
        <a href="/index.html" class="nav-logo" style="font-size:1rem">Livre Mystique</a>
        <span style="color:var(--text-muted);font-size:0.82rem">© 2026 Livre Mystique. Tous droits réservés.</span>
        <span style="font-size:0.82rem"><a href="#">Mentions légales</a> · <a href="#">Confidentialité</a></span>
      </div>
    </div>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
  <script src="/js/supabase-client.js"></script>
  <script src="/js/main.js"></script>
</body>
</html>
`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.status(200).send(html);
};
