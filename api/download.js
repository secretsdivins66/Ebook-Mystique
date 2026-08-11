// Sert le téléchargement d'un ebook acheté, via le jeton envoyé par email
// après confirmation de paiement (voir api/chariow-webhook.mjs). Aucune
// authentification utilisateur : le jeton lui-même EST la preuve d'achat
// (comme un lien de téléchargement classique), donc il doit rester
// imprévisible (24 octets aléatoires, voir randomToken() du webhook) et
// borné dans le temps/en usage (30 jours, 5 téléchargements).
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://cawyrfbmwpcoanftybew.supabase.co';

function errorPage(title, message) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex">
  <title>${title} — Arcanes Mystiques</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <header class="page-hero" role="banner">
    <div>
      <h1>${title}</h1>
      <p>${message} <a href="/contact.html">Contacte-nous</a> si tu penses qu'il s'agit d'une erreur.</p>
    </div>
  </header>
</body>
</html>`;
}

module.exports = async (req, res) => {
  const token = (req.query.token || '').toString();
  if (!token) {
    res.status(400).setHeader('Content-Type', 'text/html; charset=utf-8').send(errorPage('Lien invalide', 'Ce lien de téléchargement est incomplet.'));
    return;
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8').send(errorPage('Erreur serveur', "Le service n'est pas correctement configuré."));
    return;
  }

  const sb = createClient(SUPABASE_URL, serviceRoleKey);

  const { data: download, error: downloadError } = await sb
    .from('downloads')
    .select('id, order_id, max_downloads, download_count, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (downloadError || !download) {
    res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(errorPage('Lien introuvable', "Ce lien de téléchargement n'existe pas."));
    return;
  }
  if (new Date(download.expires_at).getTime() < Date.now()) {
    res.status(410).setHeader('Content-Type', 'text/html; charset=utf-8').send(errorPage('Lien expiré', 'Ce lien de téléchargement a expiré (30 jours après achat).'));
    return;
  }
  if (download.download_count >= download.max_downloads) {
    res
      .status(410)
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .send(errorPage('Limite atteinte', `Ce lien a déjà été utilisé ${download.max_downloads} fois, la limite autorisée.`));
    return;
  }

  const { data: order, error: orderError } = await sb.from('orders').select('product_id').eq('id', download.order_id).maybeSingle();
  if (orderError || !order) {
    res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(errorPage('Introuvable', 'Commande associée introuvable.'));
    return;
  }

  const { data: product, error: productError } = await sb.from('products').select('pdf_path').eq('id', order.product_id).maybeSingle();
  if (productError || !product || !product.pdf_path) {
    res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(errorPage('Introuvable', 'Fichier introuvable.'));
    return;
  }

  // Lien signé Supabase Storage à très courte durée de vie (le temps du
  // téléchargement lui-même) — le jeton de CE service est le contrôle
  // d'accès réel, ce lien signé n'a besoin d'exister que quelques secondes.
  const { data: signed, error: signError } = await sb.storage.from('product-files').createSignedUrl(product.pdf_path, 60);
  if (signError || !signed?.signedUrl) {
    console.error('download: failed to create signed URL', { token, error: signError });
    res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8').send(errorPage('Erreur serveur', 'Impossible de générer le lien de téléchargement.'));
    return;
  }

  // Incrémente le compteur AVANT la redirection : un abandon de
  // téléchargement par le client compte quand même comme un usage — même
  // logique que la plupart des offres "5 téléchargements" (le lien signé,
  // une fois émis, ne peut de toute façon plus être "annulé").
  await sb.from('downloads').update({ download_count: download.download_count + 1 }).eq('id', download.id);

  res.status(302).setHeader('Location', signed.signedUrl).end();
};
