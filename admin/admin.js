/* ============================================================
   ARCANES MYSTIQUES — Administration : fonctions partagées
   Nécessite js/supabase-client.js (charge window.sb) avant ce fichier.
   ============================================================ */

const AdminAuth = {
  /* Redirige vers la connexion si aucune session valide n'existe.
     Retourne la session si elle existe. */
  async require() {
    if (!window.sb) {
      window.location.href = 'login.html';
      return null;
    }
    const { data, error } = await window.sb.auth.getSession();
    if (error || !data.session) {
      window.location.href = 'login.html';
      return null;
    }
    return data.session;
  },

  async logout() {
    if (window.sb) await window.sb.auth.signOut();
    window.location.href = 'login.html';
  },
};

function adminSlugify(str) {
  return String(str)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function adminEscapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function adminToast(msg, isError = false) {
  let toast = document.querySelector('.admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'admin-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 4200);
}

/* Vérifie les dimensions minimales d'une image avant envoi.
   Retourne une Promise<{ok: boolean, width, height}>. */
function adminCheckImageDimensions(file, minWidth, minHeight) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const ok = img.naturalWidth >= minWidth && img.naturalHeight >= minHeight;
      URL.revokeObjectURL(url);
      resolve({ ok, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ ok: false, width: 0, height: 0 });
    };
    img.src = url;
  });
}

function adminFileExt(filename) {
  const m = /\.([a-zA-Z0-9]+)$/.exec(filename || '');
  return m ? m[1].toLowerCase() : 'jpg';
}
