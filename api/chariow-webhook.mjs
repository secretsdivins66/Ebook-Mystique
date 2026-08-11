// Reçoit les "Pulses" Chariow (webhooks) quand une vente d'ebook est
// confirmée. Voir api/chariow-checkout.js pour la création de la commande
// en amont.
//
// Utilise le format Web Standard (Request/Response) plutôt que le style
// module.exports=(req,res) du reste de ce dossier api/ — volontairement,
// pour un seul fichier : Vercel parse automatiquement request.body en JSON
// avec l'ancien style, ce qui détruirait les octets exacts nécessaires à
// la vérification de signature HMAC (le calcul DOIT porter sur le corps
// brut). Désactiver ce parsing se fait via une variable d'environnement
// GLOBALE au projet (NODEJS_HELPERS=0, voir doc Vercel) qui casserait
// aussi api/product.js et api/sitemap.js — l'extension .mjs isole ce choix
// à ce seul fichier sans toucher aux deux autres.
//
// Format confirmé en live sur Secret Divin (/root/secret-divin) le
// 2026-08-09/10, réutilisé ici tel quel :
// - header x-chariow-signature: "sha256=<hex>", HMAC-SHA256 du corps BRUT.
// - header x-pulse-delivery-id : clé d'idempotence.
// - header x-pulse-event : seul "successful.sale" est traité.

const SUPABASE_URL = 'https://cawyrfbmwpcoanftybew.supabase.co';

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function hmacSha256Hex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sendDownloadEmail({ resendApiKey, to, firstName, productTitle, downloadUrl }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Arcanes Mystiques <commandes@arcanes-mystiques.fr>',
      to: [to],
      subject: `Ton ebook "${productTitle}" est prêt`,
      html: `
        <p>Bonjour ${firstName || ''},</p>
        <p>Merci pour ton achat ! Voici ton lien de téléchargement sécurisé pour <strong>${productTitle}</strong> :</p>
        <p><a href="${downloadUrl}">${downloadUrl}</a></p>
        <p>Ce lien reste actif 30 jours et peut être utilisé jusqu'à 5 fois.</p>
        <p>À bientôt,<br>Arcanes Mystiques</p>
      `,
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`resend_failed: ${response.status} ${errText}`);
  }
}

async function handleEbookSale(supabaseUrl, serviceRoleKey, resendApiKey, sale, order) {
  const internalReference = sale.custom_metadata && sale.custom_metadata.internalReference;

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  if (order.status === 'completed') {
    // Idempotence supplémentaire : même si la dédup par pulse_delivery_id
    // a déjà été contournée d'une façon ou d'une autre, ne jamais renvoyer
    // un deuxième email pour la même commande.
    return;
  }

  const productRes = await fetch(
    `${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(order.product_id)}&select=id,title,price,promo_price,pdf_path`,
    { headers }
  );
  const products = await productRes.json().catch(() => []);
  const product = Array.isArray(products) ? products[0] : null;
  if (!product) {
    console.error('chariow-webhook: unknown product for order, refusing to deliver', { internalReference, productId: order.product_id });
    return;
  }

  // Même défense en profondeur que sur Secret Divin : ne jamais livrer un
  // ebook sans revérifier que le montant RÉELLEMENT rapporté par Chariow
  // correspond au prix du produit (table products, seule source de
  // vérité), même si chariow-checkout ne laisse déjà aucune prise à un
  // montant falsifié par le client.
  const expectedAmount = product.promo_price != null ? Number(product.promo_price) : Number(product.price);
  const paidAmount = sale.amount && sale.amount.value;
  const paidCurrency = sale.amount && sale.amount.currency;
  if (paidAmount !== expectedAmount || paidCurrency !== 'EUR') {
    console.error('chariow-webhook: amount/currency mismatch, refusing to deliver', {
      internalReference,
      expected: { amount: expectedAmount, currency: 'EUR' },
      received: { amount: paidAmount, currency: paidCurrency },
    });
    return;
  }

  if (!product.pdf_path) {
    console.error('chariow-webhook: product has no pdf_path, cannot deliver', { internalReference, productId: product.id });
    return;
  }

  // Marque la commande comme complétée.
  await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'completed', chariow_sale_id: sale.id, raw_payload: sale, updated_at: new Date().toISOString() }),
  });

  // Crée le jeton de téléchargement sécurisé (30 jours, 5 téléchargements
  // — exactement la promesse déjà faite dans la FAQ du site).
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await fetch(`${supabaseUrl}/rest/v1/downloads`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ order_id: order.id, token, max_downloads: 5, expires_at: expiresAt }),
  });

  const downloadUrl = `https://arcanes-mystiques.fr/api/download?token=${token}`;

  if (resendApiKey) {
    try {
      await sendDownloadEmail({
        resendApiKey,
        to: order.buyer_email,
        firstName: order.buyer_first_name,
        productTitle: product.title,
        downloadUrl,
      });
    } catch (err) {
      // La commande est déjà marquée "completed" et le lien existe : un
      // échec d'envoi d'email ne doit jamais faire perdre l'achat. Loggé
      // pour renvoi manuel si besoin, mais ne fait pas échouer le webhook
      // (Chariow ne doit pas retenter juste parce que Resend a un souci).
      console.error('chariow-webhook: email send failed, order still completed', { internalReference, error: String(err) });
    }
  } else {
    console.error('chariow-webhook: RESEND_API_KEY not configured, download link not emailed', { internalReference, downloadUrl });
  }
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  try {
    const secret = process.env.CHARIOW_WEBHOOK_SECRET || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const resendApiKey = process.env.RESEND_API_KEY || '';
    if (!secret || !serviceRoleKey) {
      console.error('chariow-webhook: server misconfigured (missing secret or service role key)');
      return jsonResponse({ error: 'server_misconfigured' }, 500);
    }

    // Corps BRUT lu AVANT tout parsing JSON — voir le commentaire d'en-tête.
    const rawBody = await request.text();

    const signatureHeader = request.headers.get('x-chariow-signature') || '';
    const expectedSignature = `sha256=${await hmacSha256Hex(secret, rawBody)}`;
    if (!signatureHeader || !timingSafeEqual(signatureHeader, expectedSignature)) {
      console.error('chariow-webhook: invalid signature');
      return jsonResponse({ error: 'invalid_signature' }, 401);
    }

    const deliveryId = request.headers.get('x-pulse-delivery-id');
    if (!deliveryId) {
      return jsonResponse({ error: 'missing_delivery_id' }, 400);
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: 'invalid_json' }, 400);
    }

    const event = request.headers.get('x-pulse-event') || payload.event;

    const headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    if (event !== 'successful.sale' || !payload.sale || !payload.sale.custom_metadata || !payload.sale.custom_metadata.internalReference) {
      console.log('chariow-webhook: event ignoré', { event, deliveryId });
      return jsonResponse({ received: true, ignored: true }, 200);
    }

    // Déduplication : Chariow peut renvoyer la même livraison plusieurs
    // fois (retry) — x-pulse-delivery-id est la clé d'idempotence. Le PATCH
    // ci-dessous ne touche QUE la ligne dont pulse_delivery_id est encore
    // NULL : la première livraison la réserve et récupère la commande
    // (retour ci-dessous) ; toute livraison suivante avec le même
    // delivery_id ne matche plus rien (colonne déjà renseignée) et
    // n'écrase jamais l'état déjà posé — pas de fenêtre de course, une
    // seule requête atomique fait office de verrou.
    const internalReference = payload.sale.custom_metadata.internalReference;
    const markRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?internal_reference=eq.${encodeURIComponent(internalReference)}&pulse_delivery_id=is.null`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ pulse_delivery_id: deliveryId }),
      }
    );
    const marked = await markRes.json().catch(() => []);
    if (!Array.isArray(marked) || marked.length === 0) {
      // Soit la commande n'existe pas (ne devrait pas arriver, le checkout
      // l'insère avant d'appeler Chariow), soit pulse_delivery_id est déjà
      // posé (retry) : dans les deux cas, ne pas retraiter.
      return jsonResponse({ received: true, duplicate: true }, 200);
    }

    await handleEbookSale(SUPABASE_URL, serviceRoleKey, resendApiKey, payload.sale, marked[0]);

    return jsonResponse({ received: true }, 200);
  } catch (err) {
    console.error('chariow-webhook: unexpected error', err);
    return jsonResponse({ error: 'internal_error' }, 500);
  }
}
