/* ============================================================
   LIVRE MYSTIQUE — Client Supabase partagé
   Utilisé par le site public (js/main.js) et l'administration
   (admin/admin.js). La clé "anon" est publique par conception :
   la sécurité réelle est appliquée par les politiques Row Level
   Security côté base de données, pas par le secret de cette clé.
   ============================================================ */

const SUPABASE_URL = 'https://cawyrfbmwpcoanftybew.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhd3lyZmJtd3Bjb2FuZnR5YmV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MjQxNDcsImV4cCI6MjA5NjUwMDE0N30.sMq_LhdpFpKTMCVXgIkDV-w5Zw8jBUktedj31b2q2dE';

window.sb = null;
if (typeof supabase !== 'undefined') {
  try {
    window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error('[Supabase] Erreur createClient:', e);
  }
} else {
  console.error('[Supabase] SDK non chargé — vérifiez le CDN');
}
