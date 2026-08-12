// Initie un paiement Chariow pour un ebook (checkout hébergé, carte/mobile
// money) — voir api/chariow-webhook.mjs pour la confirmation finale de la
// vente et la livraison. Réutilise le même compte/boutique Chariow que
// Secret Divin (/root/secret-divin), mais une Pulse (webhook) dédiée à ce
// site, avec son propre secret — voir CHARIOW-SETUP.md.
//
// Sécurité :
// - Aucune authentification utilisateur n'existe côté boutique (achat
//   anonyme, contrairement à Secret Divin) : l'identité de l'acheteur,
//   c'est simplement l'email qu'il fournit ici. Le prix, lui, ne vient
//   JAMAIS du client — toujours relu depuis `products` (service_role),
//   même principe que sur Secret Divin.
// - Le token API Chariow (CHARIOW_API_KEY) ne quitte jamais ce runtime.
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const SUPABASE_URL = 'https://cawyrfbmwpcoanftybew.supabase.co';
// Domaine réel confirmé en direct le 2026-08-12 — "arcanes-mystiques.fr"
// ne résout pas, voir la même note dans api/chariow-webhook.mjs.
const SITE_URL = 'https://www.livremystique.com';

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const isValidCountryCode = code => /^[A-Z]{2}$/.test(code) && code !== 'XX';

// Le client choisit désormais son pays via un sélecteur drapeau (voir
// js/main.js) — c'est la source de vérité, l'utilisateur sait mieux que
// quiconque d'où vient son propre numéro (une détection IP seule s'est
// montrée peu fiable en Afrique de l'Ouest, cf. commit précédent : une
// requête géolocalisée en Guinée avec un numéro ivoirien était rejetée
// par Chariow). Le header `x-vercel-ip-country` de Vercel ne sert plus
// que de filet de secours si le client omet ce champ, "CI" en dernier
// recours (zone principale de la boutique).
function resolveCountryCode(req, clientCountryCode) {
  const fromClient = String(clientCountryCode || '').trim().toUpperCase();
  if (isValidCountryCode(fromClient)) return fromClient;
  const fromHeader = String(req.headers['x-vercel-ip-country'] || '').trim().toUpperCase();
  if (isValidCountryCode(fromHeader)) return fromHeader;
  return 'CI';
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const apiKey = process.env.CHARIOW_API_KEY;
    if (!serviceRoleKey || !apiKey) {
      res.status(500).json({ error: 'server_misconfigured' });
      return;
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { slug, firstName, lastName, email, phone } = body;

    if (typeof slug !== 'string' || !slug) {
      res.status(400).json({ error: 'invalid_product' });
      return;
    }
    if (
      typeof firstName !== 'string' || !firstName.trim() ||
      typeof lastName !== 'string' || !lastName.trim() ||
      !isValidEmail(email) ||
      typeof phone?.number !== 'string' || !phone.number.trim()
    ) {
      res.status(400).json({ error: 'missing_contact_info' });
      return;
    }

    const sb = createClient(SUPABASE_URL, serviceRoleKey);

    // Seule source de vérité pour le prix ET le product_id Chariow (voir
    // supabase/chariow-setup.sql) : jamais fait confiance à autre chose
    // que `products` pour déterminer ce qui va être facturé.
    const { data: product, error: productError } = await sb
      .from('products')
      .select('id, title, price, promo_price, chariow_product_id')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    if (productError || !product) {
      console.error('chariow-checkout: product lookup failed', { slug, productError });
      res.status(400).json({ error: 'unknown_product' });
      return;
    }
    if (!product.chariow_product_id) {
      console.error('chariow-checkout: product has no chariow_product_id configured', { slug });
      res.status(400).json({ error: 'product_not_configured_for_chariow' });
      return;
    }

    const amount = product.promo_price != null ? Number(product.promo_price) : Number(product.price);
    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'product_not_payable' });
      return;
    }

    const internalReference = randomUUID();

    const chariowRequestBody = {
      product_id: product.chariow_product_id,
      email,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: { number: phone.number.trim(), country_code: resolveCountryCode(req, phone.countryCode) },
      payment_currency: 'XOF',
      redirect_url: `${SITE_URL}/merci.html`,
      // Repris tel quel dans les Pulses — c'est le seul lien fiable entre
      // une vente Chariow et notre commande. "productId"/"internalReference"
      // permettent au webhook de retrouver la commande sans jamais faire
      // confiance à un montant que le client aurait pu falsifier ici.
      custom_metadata: {
        type: 'ebook_purchase',
        internalReference,
        productId: product.id,
      },
    };

    let chariowResponseJson = null;
    try {
      const chariowResponse = await fetch('https://api.chariow.com/v1/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(chariowRequestBody),
      });
      chariowResponseJson = await chariowResponse.json().catch(() => null);
    } catch (err) {
      console.error('chariow-checkout: call to Chariow failed', { internalReference, error: err });
      res.status(502).json({ error: 'chariow_unreachable' });
      return;
    }

    const step = chariowResponseJson && chariowResponseJson.data && chariowResponseJson.data.step;

    const { error: insertError } = await sb.from('orders').insert({
      product_id: product.id,
      buyer_email: email,
      buyer_first_name: firstName.trim(),
      buyer_last_name: lastName.trim(),
      amount,
      currency: 'XOF',
      status: step === 'completed' || step === 'already_purchased' ? 'completed' : 'pending',
      internal_reference: internalReference,
      raw_payload: { request: chariowRequestBody, response: chariowResponseJson },
    });

    if (insertError) {
      console.error('chariow-checkout: order insert failed', { internalReference, error: insertError });
      res.status(500).json({ error: 'db_error' });
      return;
    }

    // Un succès n'a PAS de "message":"success" au niveau racine (confirmé
    // en live sur Secret Divin le 2026-08-10 — seules les erreurs en ont
    // un) : `step` présent dans `data` suffit.
    if (!chariowResponseJson || !step) {
      console.error('chariow-checkout: unexpected Chariow response', { internalReference, response: chariowResponseJson });
      res.status(502).json({ error: 'chariow_checkout_failed', reference: internalReference });
      return;
    }

    if (step === 'payment') {
      const checkoutUrl = chariowResponseJson.data && chariowResponseJson.data.payment && chariowResponseJson.data.payment.checkout_url;
      if (!checkoutUrl) {
        res.status(502).json({ error: 'missing_checkout_url', reference: internalReference });
        return;
      }
      res.status(200).json({ step, checkoutUrl, reference: internalReference });
      return;
    }

    // 'completed' / 'already_purchased' : la vente est déjà finalisée côté
    // Chariow, mais la livraison (email + lien) reste uniquement du
    // ressort du webhook (canal serveur-à-serveur authentifié, montant
    // reconfirmé) — jamais déclenchée depuis cette réponse au client.
    res.status(200).json({ step, message: (chariowResponseJson.data && chariowResponseJson.data.message) || null, reference: internalReference });
  } catch (err) {
    console.error('chariow-checkout: unexpected error', err);
    res.status(500).json({ error: 'internal_error' });
  }
};
