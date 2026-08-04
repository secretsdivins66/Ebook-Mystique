/* ============================================================
   ARCANES MYSTIQUES — Client Supabase partagé
   Utilisé par le site public (js/main.js) et l'administration
   (admin/admin.js). La clé "anon" est publique par conception :
   la sécurité réelle est appliquée par les politiques Row Level
   Security côté base de données, pas par le secret de cette clé.
   ============================================================ */

const SUPABASE_URL = 'https://kaujtphylrcautstokzw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthdWp0cGh5bHJjYXV0c3Rva3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MDM3MjUsImV4cCI6MjA5NjE3OTcyNX0.Aa9MxgVA2f5wAC2T0ameQx4OleNrQox3UcWw8E_v6Ew';

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
