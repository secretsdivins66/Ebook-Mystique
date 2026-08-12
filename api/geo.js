// Petit endpoint utilisé uniquement pour préremplir le sélecteur pays du
// formulaire de paiement (js/main.js) avec le pays probable du visiteur —
// l'utilisateur reste toujours libre de le changer via le drapeau, cette
// détection n'est qu'une suggestion de départ. Même source que le filet
// de secours d'api/chariow-checkout.js : le header géo IP de Vercel.
function isValidCountryCode(code) {
  return /^[A-Z]{2}$/.test(code) && code !== 'XX';
}

module.exports = (req, res) => {
  const header = String(req.headers['x-vercel-ip-country'] || '').trim().toUpperCase();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ country: isValidCountryCode(header) ? header : null });
};
