/* ============================================================
   LIVRE MYSTIQUE — JavaScript principal
   ============================================================ */

/* ---------- Supabase Client ----------
   Le client est initialisé par js/supabase-client.js (chargé avant ce
   fichier) et exposé sur window.sb. */
const db = window.sb || null;

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Canvas Starfield (Hero) ---------- */
  const canvas = document.getElementById('starCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let stars = [];
    let animId;

    function resizeCanvas() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createStars(count = 220) {
      stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x:       Math.random() * canvas.width,
          y:       Math.random() * canvas.height,
          r:       Math.random() * 1.6 + 0.2,
          alpha:   Math.random(),
          speed:   Math.random() * 0.004 + 0.001,
          phase:   Math.random() * Math.PI * 2,
          driftX:  (Math.random() - 0.5) * 0.15,
          driftY:  (Math.random() - 0.5) * 0.08,
          gold:    Math.random() > 0.82,
        });
      }
    }

    function drawStars(t) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.phase += s.speed;
        const a = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(s.phase));
        s.x += s.driftX;
        s.y += s.driftY;
        if (s.x < 0) s.x = canvas.width;
        if (s.x > canvas.width) s.x = 0;
        if (s.y < 0) s.y = canvas.height;
        if (s.y > canvas.height) s.y = 0;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.gold
          ? `rgba(212,175,55,${a * 0.9})`
          : `rgba(180,180,255,${a * 0.7})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(drawStars);
    }

    resizeCanvas();
    createStars();
    drawStars();
    window.addEventListener('resize', () => {
      cancelAnimationFrame(animId);
      resizeCanvas();
      createStars();
      drawStars();
    });
  }

  /* ---------- Navbar scroll ---------- */
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    });
  }

  /* ---------- Mobile menu ---------- */
  const hamburger = document.querySelector('.hamburger');
  const overlay   = document.querySelector('.nav-overlay');
  const closeBtn  = document.querySelector('.overlay-close');

  function closeMenu() {
    overlay.classList.remove('open');
    if (hamburger) {
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    }
    document.body.style.overflow = '';
  }

  if (hamburger && overlay) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      overlay.classList.toggle('open');
      const isOpen = overlay.classList.contains('open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  if (closeBtn && overlay) {
    closeBtn.addEventListener('click', closeMenu);
  }

  if (overlay) {
    overlay.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeMenu);
    });
  }

  /* ---------- FAQ Accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(o => o.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  /* ---------- Testimonials Slider ---------- */
  const track = document.querySelector('.testimonials-track');
  if (track) {
    const cards    = track.querySelectorAll('.testimonial-card');
    const dots     = document.querySelectorAll('.testi-dot');
    const prevBtn  = document.querySelector('.testi-prev');
    const nextBtn  = document.querySelector('.testi-next');
    let current    = 0;
    let autoTimer;

    function goTo(idx) {
      current = (idx + cards.length) % cards.length;
      track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }

    if (prevBtn) prevBtn.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { goTo(current + 1); resetAuto(); });
    dots.forEach((d, i) => d.addEventListener('click', () => { goTo(i); resetAuto(); }));

    function resetAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(() => goTo(current + 1), 5500);
    }

    goTo(0);
    resetAuto();

    // Swipe tactile sur mobile
    let touchStartX = 0;
    track.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });
    track.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        goTo(diff > 0 ? current + 1 : current - 1);
        resetAuto();
      }
    }, { passive: true });
  }

  /* ---------- Scroll Reveal ---------- */
  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 80);
          revealObserver.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  function observeReveal(root = document) {
    root.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
  }
  observeReveal();

  /* ---------- Toast notification ---------- */
  function showToast(msg) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 3800);
  }

  /* ---------- Buy button → paiement Chariow ----------
     Sélecteur pays par drapeau, choisi par l'utilisateur lui-même — une
     détection IP seule s'est montrée peu fiable (cf. commit précédent :
     géolocalisation en Guinée + numéro ivoirien rejeté par Chariow).
     Liste complète ISO 3166-1 (noms via Intl.DisplayNames, triés en
     français) — "CI" présélectionné par défaut (zone principale de la
     boutique), l'utilisateur peut choisir n'importe quel pays de
     résidence. L'indicatif ISO alpha-2 choisi part vers
     api/chariow-checkout.js. */
  const COUNTRY_OPTIONS = [
    { code: 'AF', flag: '🇦🇫', name: "Afghanistan" },
    { code: 'ZA', flag: '🇿🇦', name: "Afrique du Sud" },
    { code: 'AL', flag: '🇦🇱', name: "Albanie" },
    { code: 'DZ', flag: '🇩🇿', name: "Algérie" },
    { code: 'DE', flag: '🇩🇪', name: "Allemagne" },
    { code: 'AD', flag: '🇦🇩', name: "Andorre" },
    { code: 'AO', flag: '🇦🇴', name: "Angola" },
    { code: 'AI', flag: '🇦🇮', name: "Anguilla" },
    { code: 'AG', flag: '🇦🇬', name: "Antigua-et-Barbuda" },
    { code: 'SA', flag: '🇸🇦', name: "Arabie saoudite" },
    { code: 'AR', flag: '🇦🇷', name: "Argentine" },
    { code: 'AM', flag: '🇦🇲', name: "Arménie" },
    { code: 'AW', flag: '🇦🇼', name: "Aruba" },
    { code: 'AU', flag: '🇦🇺', name: "Australie" },
    { code: 'AT', flag: '🇦🇹', name: "Autriche" },
    { code: 'AZ', flag: '🇦🇿', name: "Azerbaïdjan" },
    { code: 'BS', flag: '🇧🇸', name: "Bahamas" },
    { code: 'BH', flag: '🇧🇭', name: "Bahreïn" },
    { code: 'BD', flag: '🇧🇩', name: "Bangladesh" },
    { code: 'BB', flag: '🇧🇧', name: "Barbade" },
    { code: 'BE', flag: '🇧🇪', name: "Belgique" },
    { code: 'BZ', flag: '🇧🇿', name: "Belize" },
    { code: 'BJ', flag: '🇧🇯', name: "Bénin" },
    { code: 'BM', flag: '🇧🇲', name: "Bermudes" },
    { code: 'BT', flag: '🇧🇹', name: "Bhoutan" },
    { code: 'BY', flag: '🇧🇾', name: "Biélorussie" },
    { code: 'BO', flag: '🇧🇴', name: "Bolivie" },
    { code: 'BA', flag: '🇧🇦', name: "Bosnie-Herzégovine" },
    { code: 'BW', flag: '🇧🇼', name: "Botswana" },
    { code: 'BR', flag: '🇧🇷', name: "Brésil" },
    { code: 'BN', flag: '🇧🇳', name: "Brunei" },
    { code: 'BG', flag: '🇧🇬', name: "Bulgarie" },
    { code: 'BF', flag: '🇧🇫', name: "Burkina Faso" },
    { code: 'BI', flag: '🇧🇮', name: "Burundi" },
    { code: 'KH', flag: '🇰🇭', name: "Cambodge" },
    { code: 'CM', flag: '🇨🇲', name: "Cameroun" },
    { code: 'CA', flag: '🇨🇦', name: "Canada" },
    { code: 'CV', flag: '🇨🇻', name: "Cap-Vert" },
    { code: 'CL', flag: '🇨🇱', name: "Chili" },
    { code: 'CN', flag: '🇨🇳', name: "Chine" },
    { code: 'CY', flag: '🇨🇾', name: "Chypre" },
    { code: 'CO', flag: '🇨🇴', name: "Colombie" },
    { code: 'KM', flag: '🇰🇲', name: "Comores" },
    { code: 'CG', flag: '🇨🇬', name: "Congo-Brazzaville" },
    { code: 'CD', flag: '🇨🇩', name: "Congo-Kinshasa" },
    { code: 'KP', flag: '🇰🇵', name: "Corée du Nord" },
    { code: 'KR', flag: '🇰🇷', name: "Corée du Sud" },
    { code: 'CR', flag: '🇨🇷', name: "Costa Rica" },
    { code: 'CI', flag: '🇨🇮', name: "Côte d’Ivoire" },
    { code: 'HR', flag: '🇭🇷', name: "Croatie" },
    { code: 'CU', flag: '🇨🇺', name: "Cuba" },
    { code: 'CW', flag: '🇨🇼', name: "Curaçao" },
    { code: 'DK', flag: '🇩🇰', name: "Danemark" },
    { code: 'DJ', flag: '🇩🇯', name: "Djibouti" },
    { code: 'DM', flag: '🇩🇲', name: "Dominique" },
    { code: 'EG', flag: '🇪🇬', name: "Égypte" },
    { code: 'AE', flag: '🇦🇪', name: "Émirats arabes unis" },
    { code: 'EC', flag: '🇪🇨', name: "Équateur" },
    { code: 'ER', flag: '🇪🇷', name: "Érythrée" },
    { code: 'ES', flag: '🇪🇸', name: "Espagne" },
    { code: 'EE', flag: '🇪🇪', name: "Estonie" },
    { code: 'SZ', flag: '🇸🇿', name: "Eswatini" },
    { code: 'VA', flag: '🇻🇦', name: "État de la Cité du Vatican" },
    { code: 'US', flag: '🇺🇸', name: "États-Unis" },
    { code: 'ET', flag: '🇪🇹', name: "Éthiopie" },
    { code: 'FJ', flag: '🇫🇯', name: "Fidji" },
    { code: 'FI', flag: '🇫🇮', name: "Finlande" },
    { code: 'FR', flag: '🇫🇷', name: "France" },
    { code: 'GA', flag: '🇬🇦', name: "Gabon" },
    { code: 'GM', flag: '🇬🇲', name: "Gambie" },
    { code: 'GE', flag: '🇬🇪', name: "Géorgie" },
    { code: 'GH', flag: '🇬🇭', name: "Ghana" },
    { code: 'GI', flag: '🇬🇮', name: "Gibraltar" },
    { code: 'GR', flag: '🇬🇷', name: "Grèce" },
    { code: 'GD', flag: '🇬🇩', name: "Grenade" },
    { code: 'GL', flag: '🇬🇱', name: "Groenland" },
    { code: 'GP', flag: '🇬🇵', name: "Guadeloupe" },
    { code: 'GU', flag: '🇬🇺', name: "Guam" },
    { code: 'GT', flag: '🇬🇹', name: "Guatemala" },
    { code: 'GG', flag: '🇬🇬', name: "Guernesey" },
    { code: 'GN', flag: '🇬🇳', name: "Guinée" },
    { code: 'GQ', flag: '🇬🇶', name: "Guinée équatoriale" },
    { code: 'GW', flag: '🇬🇼', name: "Guinée-Bissau" },
    { code: 'GY', flag: '🇬🇾', name: "Guyana" },
    { code: 'GF', flag: '🇬🇫', name: "Guyane française" },
    { code: 'HT', flag: '🇭🇹', name: "Haïti" },
    { code: 'HN', flag: '🇭🇳', name: "Honduras" },
    { code: 'HU', flag: '🇭🇺', name: "Hongrie" },
    { code: 'CX', flag: '🇨🇽', name: "Île Christmas" },
    { code: 'IM', flag: '🇮🇲', name: "Île de Man" },
    { code: 'NF', flag: '🇳🇫', name: "Île Norfolk" },
    { code: 'AX', flag: '🇦🇽', name: "Îles Åland" },
    { code: 'KY', flag: '🇰🇾', name: "Îles Caïmans" },
    { code: 'CC', flag: '🇨🇨', name: "Îles Cocos" },
    { code: 'CK', flag: '🇨🇰', name: "Îles Cook" },
    { code: 'FO', flag: '🇫🇴', name: "Îles Féroé" },
    { code: 'FK', flag: '🇫🇰', name: "Îles Malouines" },
    { code: 'MP', flag: '🇲🇵', name: "Îles Mariannes du Nord" },
    { code: 'MH', flag: '🇲🇭', name: "Îles Marshall" },
    { code: 'PN', flag: '🇵🇳', name: "Îles Pitcairn" },
    { code: 'SB', flag: '🇸🇧', name: "Îles Salomon" },
    { code: 'TC', flag: '🇹🇨', name: "Îles Turques-et-Caïques" },
    { code: 'VG', flag: '🇻🇬', name: "Îles Vierges britanniques" },
    { code: 'VI', flag: '🇻🇮', name: "Îles Vierges des États-Unis" },
    { code: 'IN', flag: '🇮🇳', name: "Inde" },
    { code: 'ID', flag: '🇮🇩', name: "Indonésie" },
    { code: 'IQ', flag: '🇮🇶', name: "Irak" },
    { code: 'IR', flag: '🇮🇷', name: "Iran" },
    { code: 'IE', flag: '🇮🇪', name: "Irlande" },
    { code: 'IS', flag: '🇮🇸', name: "Islande" },
    { code: 'IL', flag: '🇮🇱', name: "Israël" },
    { code: 'IT', flag: '🇮🇹', name: "Italie" },
    { code: 'JM', flag: '🇯🇲', name: "Jamaïque" },
    { code: 'JP', flag: '🇯🇵', name: "Japon" },
    { code: 'JE', flag: '🇯🇪', name: "Jersey" },
    { code: 'JO', flag: '🇯🇴', name: "Jordanie" },
    { code: 'KZ', flag: '🇰🇿', name: "Kazakhstan" },
    { code: 'KE', flag: '🇰🇪', name: "Kenya" },
    { code: 'KG', flag: '🇰🇬', name: "Kirghizstan" },
    { code: 'KI', flag: '🇰🇮', name: "Kiribati" },
    { code: 'KW', flag: '🇰🇼', name: "Koweït" },
    { code: 'RE', flag: '🇷🇪', name: "La Réunion" },
    { code: 'LA', flag: '🇱🇦', name: "Laos" },
    { code: 'LS', flag: '🇱🇸', name: "Lesotho" },
    { code: 'LV', flag: '🇱🇻', name: "Lettonie" },
    { code: 'LB', flag: '🇱🇧', name: "Liban" },
    { code: 'LR', flag: '🇱🇷', name: "Liberia" },
    { code: 'LY', flag: '🇱🇾', name: "Libye" },
    { code: 'LI', flag: '🇱🇮', name: "Liechtenstein" },
    { code: 'LT', flag: '🇱🇹', name: "Lituanie" },
    { code: 'LU', flag: '🇱🇺', name: "Luxembourg" },
    { code: 'MK', flag: '🇲🇰', name: "Macédoine du Nord" },
    { code: 'MG', flag: '🇲🇬', name: "Madagascar" },
    { code: 'MY', flag: '🇲🇾', name: "Malaisie" },
    { code: 'MW', flag: '🇲🇼', name: "Malawi" },
    { code: 'MV', flag: '🇲🇻', name: "Maldives" },
    { code: 'ML', flag: '🇲🇱', name: "Mali" },
    { code: 'MT', flag: '🇲🇹', name: "Malte" },
    { code: 'MA', flag: '🇲🇦', name: "Maroc" },
    { code: 'MQ', flag: '🇲🇶', name: "Martinique" },
    { code: 'MU', flag: '🇲🇺', name: "Maurice" },
    { code: 'MR', flag: '🇲🇷', name: "Mauritanie" },
    { code: 'YT', flag: '🇾🇹', name: "Mayotte" },
    { code: 'MX', flag: '🇲🇽', name: "Mexique" },
    { code: 'FM', flag: '🇫🇲', name: "Micronésie" },
    { code: 'MD', flag: '🇲🇩', name: "Moldavie" },
    { code: 'MC', flag: '🇲🇨', name: "Monaco" },
    { code: 'MN', flag: '🇲🇳', name: "Mongolie" },
    { code: 'ME', flag: '🇲🇪', name: "Monténégro" },
    { code: 'MS', flag: '🇲🇸', name: "Montserrat" },
    { code: 'MZ', flag: '🇲🇿', name: "Mozambique" },
    { code: 'MM', flag: '🇲🇲', name: "Myanmar (Birmanie)" },
    { code: 'NA', flag: '🇳🇦', name: "Namibie" },
    { code: 'NR', flag: '🇳🇷', name: "Nauru" },
    { code: 'NP', flag: '🇳🇵', name: "Népal" },
    { code: 'NI', flag: '🇳🇮', name: "Nicaragua" },
    { code: 'NE', flag: '🇳🇪', name: "Niger" },
    { code: 'NG', flag: '🇳🇬', name: "Nigeria" },
    { code: 'NU', flag: '🇳🇺', name: "Niue" },
    { code: 'NO', flag: '🇳🇴', name: "Norvège" },
    { code: 'NC', flag: '🇳🇨', name: "Nouvelle-Calédonie" },
    { code: 'NZ', flag: '🇳🇿', name: "Nouvelle-Zélande" },
    { code: 'OM', flag: '🇴🇲', name: "Oman" },
    { code: 'UG', flag: '🇺🇬', name: "Ouganda" },
    { code: 'UZ', flag: '🇺🇿', name: "Ouzbékistan" },
    { code: 'PK', flag: '🇵🇰', name: "Pakistan" },
    { code: 'PW', flag: '🇵🇼', name: "Palaos" },
    { code: 'PA', flag: '🇵🇦', name: "Panama" },
    { code: 'PG', flag: '🇵🇬', name: "Papouasie-Nouvelle-Guinée" },
    { code: 'PY', flag: '🇵🇾', name: "Paraguay" },
    { code: 'NL', flag: '🇳🇱', name: "Pays-Bas" },
    { code: 'BQ', flag: '🇧🇶', name: "Pays-Bas caribéens" },
    { code: 'PE', flag: '🇵🇪', name: "Pérou" },
    { code: 'PH', flag: '🇵🇭', name: "Philippines" },
    { code: 'PL', flag: '🇵🇱', name: "Pologne" },
    { code: 'PF', flag: '🇵🇫', name: "Polynésie française" },
    { code: 'PR', flag: '🇵🇷', name: "Porto Rico" },
    { code: 'PT', flag: '🇵🇹', name: "Portugal" },
    { code: 'QA', flag: '🇶🇦', name: "Qatar" },
    { code: 'HK', flag: '🇭🇰', name: "R.A.S. chinoise de Hong Kong" },
    { code: 'MO', flag: '🇲🇴', name: "R.A.S. chinoise de Macao" },
    { code: 'CF', flag: '🇨🇫', name: "République centrafricaine" },
    { code: 'DO', flag: '🇩🇴', name: "République dominicaine" },
    { code: 'RO', flag: '🇷🇴', name: "Roumanie" },
    { code: 'GB', flag: '🇬🇧', name: "Royaume-Uni" },
    { code: 'RU', flag: '🇷🇺', name: "Russie" },
    { code: 'RW', flag: '🇷🇼', name: "Rwanda" },
    { code: 'EH', flag: '🇪🇭', name: "Sahara occidental" },
    { code: 'BL', flag: '🇧🇱', name: "Saint-Barthélemy" },
    { code: 'KN', flag: '🇰🇳', name: "Saint-Christophe-et-Niévès" },
    { code: 'SM', flag: '🇸🇲', name: "Saint-Marin" },
    { code: 'MF', flag: '🇲🇫', name: "Saint-Martin" },
    { code: 'SX', flag: '🇸🇽', name: "Saint-Martin (partie néerlandaise)" },
    { code: 'PM', flag: '🇵🇲', name: "Saint-Pierre-et-Miquelon" },
    { code: 'VC', flag: '🇻🇨', name: "Saint-Vincent-et-les Grenadines" },
    { code: 'SH', flag: '🇸🇭', name: "Sainte-Hélène" },
    { code: 'LC', flag: '🇱🇨', name: "Sainte-Lucie" },
    { code: 'SV', flag: '🇸🇻', name: "Salvador" },
    { code: 'WS', flag: '🇼🇸', name: "Samoa" },
    { code: 'AS', flag: '🇦🇸', name: "Samoa américaines" },
    { code: 'ST', flag: '🇸🇹', name: "Sao Tomé-et-Principe" },
    { code: 'SN', flag: '🇸🇳', name: "Sénégal" },
    { code: 'RS', flag: '🇷🇸', name: "Serbie" },
    { code: 'SC', flag: '🇸🇨', name: "Seychelles" },
    { code: 'SL', flag: '🇸🇱', name: "Sierra Leone" },
    { code: 'SG', flag: '🇸🇬', name: "Singapour" },
    { code: 'SK', flag: '🇸🇰', name: "Slovaquie" },
    { code: 'SI', flag: '🇸🇮', name: "Slovénie" },
    { code: 'SO', flag: '🇸🇴', name: "Somalie" },
    { code: 'SD', flag: '🇸🇩', name: "Soudan" },
    { code: 'SS', flag: '🇸🇸', name: "Soudan du Sud" },
    { code: 'LK', flag: '🇱🇰', name: "Sri Lanka" },
    { code: 'SE', flag: '🇸🇪', name: "Suède" },
    { code: 'CH', flag: '🇨🇭', name: "Suisse" },
    { code: 'SR', flag: '🇸🇷', name: "Suriname" },
    { code: 'SY', flag: '🇸🇾', name: "Syrie" },
    { code: 'TJ', flag: '🇹🇯', name: "Tadjikistan" },
    { code: 'TW', flag: '🇹🇼', name: "Taïwan" },
    { code: 'TZ', flag: '🇹🇿', name: "Tanzanie" },
    { code: 'TD', flag: '🇹🇩', name: "Tchad" },
    { code: 'CZ', flag: '🇨🇿', name: "Tchéquie" },
    { code: 'PS', flag: '🇵🇸', name: "Territoires palestiniens" },
    { code: 'TH', flag: '🇹🇭', name: "Thaïlande" },
    { code: 'TL', flag: '🇹🇱', name: "Timor oriental" },
    { code: 'TG', flag: '🇹🇬', name: "Togo" },
    { code: 'TK', flag: '🇹🇰', name: "Tokelau" },
    { code: 'TO', flag: '🇹🇴', name: "Tonga" },
    { code: 'TT', flag: '🇹🇹', name: "Trinité-et-Tobago" },
    { code: 'TN', flag: '🇹🇳', name: "Tunisie" },
    { code: 'TM', flag: '🇹🇲', name: "Turkménistan" },
    { code: 'TR', flag: '🇹🇷', name: "Turquie" },
    { code: 'TV', flag: '🇹🇻', name: "Tuvalu" },
    { code: 'UA', flag: '🇺🇦', name: "Ukraine" },
    { code: 'UY', flag: '🇺🇾', name: "Uruguay" },
    { code: 'VU', flag: '🇻🇺', name: "Vanuatu" },
    { code: 'VE', flag: '🇻🇪', name: "Venezuela" },
    { code: 'VN', flag: '🇻🇳', name: "Viêt Nam" },
    { code: 'WF', flag: '🇼🇫', name: "Wallis-et-Futuna" },
    { code: 'YE', flag: '🇾🇪', name: "Yémen" },
    { code: 'ZM', flag: '🇿🇲', name: "Zambie" },
    { code: 'ZW', flag: '🇿🇼', name: "Zimbabwe" },
  ];

  function closeCheckoutModal() {
    document.querySelector('.checkout-modal-overlay')?.remove();
  }

  function openCheckoutModal(slug, title) {
    const overlay = document.createElement('div');
    overlay.className = 'checkout-modal-overlay';
    const countryOptionsHtml = COUNTRY_OPTIONS
      .map(c => `<option value="${c.code}"${c.code === 'CI' ? ' selected' : ''}>${c.flag} ${c.name}</option>`)
      .join('');
    overlay.innerHTML = `
      <div class="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-modal-title">
        <h3 id="checkout-modal-title">Tes infos pour le paiement</h3>
        <p class="checkout-modal-note">Requises par notre prestataire de paiement pour confirmer ta commande de « ${title} ».</p>
        <form class="checkout-form">
          <div class="form-grid">
            <div class="form-group"><label for="co-first-name">Prénom</label><input type="text" id="co-first-name" required></div>
            <div class="form-group"><label for="co-last-name">Nom</label><input type="text" id="co-last-name" required></div>
            <div class="form-group"><label for="co-email">Email</label><input type="email" id="co-email" required></div>
            <div class="form-group">
              <label for="co-phone">Téléphone</label>
              <div class="phone-input-group">
                <select id="co-country" aria-label="Pays de l'indicatif téléphonique">${countryOptionsHtml}</select>
                <input type="tel" id="co-phone" required>
              </div>
            </div>
          </div>
          <p class="checkout-modal-error" hidden></p>
          <div class="checkout-modal-actions">
            <button type="submit" class="btn btn-primary">Continuer vers le paiement</button>
            <button type="button" class="btn btn-secondary checkout-cancel">Annuler</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => { if (e.target === overlay) closeCheckoutModal(); });
    overlay.querySelector('.checkout-cancel').addEventListener('click', closeCheckoutModal);

    const form = overlay.querySelector('.checkout-form');
    const errorEl = overlay.querySelector('.checkout-modal-error');
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async e => {
      e.preventDefault();
      errorEl.hidden = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Chargement...';

      try {
        const response = await fetch('/api/chariow-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug,
            firstName: form.querySelector('#co-first-name').value.trim(),
            lastName: form.querySelector('#co-last-name').value.trim(),
            email: form.querySelector('#co-email').value.trim().toLowerCase(),
            phone: {
              number: form.querySelector('#co-phone').value.trim(),
              countryCode: form.querySelector('#co-country').value,
            },
          }),
        });
        const json = await response.json().catch(() => ({}));

        if (response.ok && json.step === 'payment' && json.checkoutUrl) {
          window.location.href = json.checkoutUrl;
          return;
        }
        if (response.ok && (json.step === 'completed' || json.step === 'already_purchased')) {
          errorEl.textContent = json.message || 'Cet achat a déjà été finalisé.';
          errorEl.hidden = false;
        } else {
          errorEl.textContent = 'Le paiement a échoué, réessaie plus tard.';
          errorEl.hidden = false;
        }
      } catch {
        errorEl.textContent = 'Impossible de contacter le serveur de paiement, réessaie plus tard.';
        errorEl.hidden = false;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Continuer vers le paiement';
      }
    });
  }

  // Délégation d'événement (plutôt qu'un forEach direct sur les boutons
  // présents au chargement) : les cartes de la page d'accueil sont
  // insérées dynamiquement après la requête Supabase, donc leurs boutons
  // .btn-buy n'existent pas encore à ce moment-là.
  document.addEventListener('click', e => {
    const btn = e.target.closest('button.btn-buy');
    if (!btn) return;
    e.preventDefault();
    const slug = btn.dataset.slug;
    const title = btn.closest('[data-title]')?.dataset.title || 'cet ebook';
    if (!slug) {
      showToast('Ce produit n’est pas encore disponible à l’achat.');
      return;
    }
    openCheckoutModal(slug, title);
  });

  /* ---------- Newsletter form → Supabase ---------- */
  document.querySelectorAll('.newsletter-form').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const btn   = form.querySelector('button[type="submit"]');
      if (!input || !input.value.trim()) return;

      const email = input.value.trim().toLowerCase();
      const originalHtml = btn.innerHTML;
      btn.innerHTML = 'Envoi...';
      btn.disabled = true;

      if (db) {
        const { data, error } = await db
          .from('subscribers')
          .insert({ email, source: 'newsletter' });

        if (error) {
          console.error('[Supabase] Newsletter insert error:', {
            message : error.message,
            code    : error.code,
            details : error.details,
            hint    : error.hint,
            status  : error.status,
          });
          if (error.code === '23505') {
            showToast('Vous êtes déjà abonné(e) à notre newsletter');
          } else {
            showToast(`Erreur [${error.code || error.status}] : ${error.message}`);
          }
        } else {
          console.log('[Supabase] Subscriber saved:', data);
          showToast('Merci ! Bienvenue dans le Cercle Mystique');
          input.value = '';
        }
      } else {
        showToast('Merci ! Vous êtes maintenant abonné(e)');
        input.value = '';
      }

      btn.innerHTML = originalHtml;
      btn.disabled = false;
    });
  });

  /* ---------- Contact form → Supabase ---------- */
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = contactForm.querySelector('button[type="submit"]');
      const originalHtml = btn.innerHTML;
      btn.innerHTML = 'Envoi en cours...';
      btn.disabled = true;

      const payload = {
        firstname : contactForm.querySelector('[name="firstname"]')?.value.trim()              || '',
        lastname  : contactForm.querySelector('[name="lastname"]')?.value.trim()               || '',
        email     : contactForm.querySelector('[name="email"]')?.value.trim().toLowerCase()    || '',
        subject   : contactForm.querySelector('[name="subject"]')?.value                       || '',
        message   : contactForm.querySelector('[name="message"]')?.value.trim()                || '',
      };

      if (db) {
        const { data, error } = await db.from('contacts').insert(payload);
        if (error) {
          console.error('[Supabase] Contact insert error:', {
            message : error.message,
            code    : error.code,
            details : error.details,
            hint    : error.hint,
            status  : error.status,
          });
          showToast(`Erreur [${error.code || error.status}] : ${error.message}`);
        } else {
          console.log('[Supabase] Contact saved:', data);
          showToast('Message envoyé — nous vous répondrons sous 48h');
          contactForm.reset();
        }
      } else {
        showToast('Message envoyé — nous vous répondrons sous 48h');
        contactForm.reset();
      }

      btn.innerHTML = originalHtml;
      btn.disabled = false;
    });
  }

  /* ---------- Storefront: produits publiés depuis Supabase ---------- */
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

  function renderProductCard(p, toneIndex) {
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
              <div class="ebook-actions">
                <button class="btn btn-primary btn-sm btn-buy" data-slug="${escapeHtml(p.slug)}">Acheter maintenant</button>
                <a href="ebooks/${escapeHtml(p.slug)}" class="btn btn-secondary btn-sm">Découvrir</a>
              </div>
            </div>
          </div>
        </article>`;
  }

  const productsContainer = document.getElementById('products-container');
  if (productsContainer && db) {
    (async () => {
      const { data, error } = await db
        .from('products')
        .select('slug, title, short_description, category, price, promo_price, thumbnail_url')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Supabase] Products fetch error:', error);
        return;
      }
      if (!data || data.length === 0) return;

      productsContainer.innerHTML = `<div class="ebooks-grid">${
        data.map((p, i) => renderProductCard(p, (i % 4) + 1)).join('')
      }</div>`;
      observeReveal(productsContainer);
    })();
  }

});
