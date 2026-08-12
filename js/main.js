/* ============================================================
   ARCANES MYSTIQUES — JavaScript principal
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
     Indicatifs pays au format ISO alpha-2 (confirmé en live côté Secret
     Divin le 2026-08-09 : Chariow rejette un indicatif nu comme "225",
     accepte "CI"). Le pays par défaut ici est la France (site en euros),
     contrairement à Secret Divin (zone FCFA). */
  const COUNTRY_CODES = [
    { code: 'FR', label: 'France (+33)' },
    { code: 'BE', label: 'Belgique (+32)' },
    { code: 'CH', label: 'Suisse (+41)' },
    { code: 'CA', label: 'Canada (+1)' },
    { code: 'CI', label: "Côte d'Ivoire (+225)" },
    { code: 'SN', label: 'Sénégal (+221)' },
  ];

  function closeCheckoutModal() {
    document.querySelector('.checkout-modal-overlay')?.remove();
  }

  function openCheckoutModal(slug, title) {
    const overlay = document.createElement('div');
    overlay.className = 'checkout-modal-overlay';
    overlay.innerHTML = `
      <div class="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-modal-title">
        <h3 id="checkout-modal-title">Tes infos pour le paiement</h3>
        <p class="checkout-modal-note">Requises par notre prestataire de paiement pour confirmer ta commande de « ${title} ».</p>
        <form class="checkout-form">
          <div class="form-grid">
            <div class="form-group"><label for="co-first-name">Prénom</label><input type="text" id="co-first-name" required></div>
            <div class="form-group"><label for="co-last-name">Nom</label><input type="text" id="co-last-name" required></div>
            <div class="form-group"><label for="co-email">Email</label><input type="email" id="co-email" required></div>
            <div class="form-group"><label for="co-country">Pays</label>
              <select id="co-country">${COUNTRY_CODES.map(c => `<option value="${c.code}">${c.label}</option>`).join('')}</select>
            </div>
            <div class="form-group"><label for="co-phone">Téléphone</label><input type="tel" id="co-phone" required></div>
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

  document.querySelectorAll('button.btn-buy').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const slug = btn.dataset.slug;
      const title = btn.closest('[data-title]')?.dataset.title || 'cet ebook';
      if (!slug) {
        showToast('Ce produit n’est pas encore disponible à l’achat.');
        return;
      }
      openCheckoutModal(slug, title);
    });
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
              <a href="ebooks/${escapeHtml(p.slug)}" class="btn btn-secondary btn-sm">Découvrir</a>
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
