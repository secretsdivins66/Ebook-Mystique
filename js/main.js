/* ============================================================
   ARCANES MYSTIQUES — JavaScript principal
   ============================================================ */

/* ---------- Supabase Client ---------- */
const SUPABASE_URL = 'https://kaujtphylrcautstokzw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthdWp0cGh5bHJjYXV0c3Rva3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MDM3MjUsImV4cCI6MjA5NjE3OTcyNX0.Aa9MxgVA2f5wAC2T0ameQx4OleNrQox3UcWw8E_v6Ew';

let db = null;
if (typeof supabase !== 'undefined') {
  try {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[Supabase] ✅ Client initialisé');
  } catch (e) {
    console.error('[Supabase] ❌ Erreur createClient:', e);
  }
} else {
  console.error('[Supabase] ❌ SDK non chargé — vérifiez le CDN');
}

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
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            setTimeout(() => e.target.classList.add('visible'), i * 80);
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach(el => observer.observe(el));
  }

  /* ---------- Tabs (ebook detail) ---------- */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById(target);
      if (panel) panel.classList.add('active');
    });
  });

  /* ---------- Toast notification ---------- */
  function showToast(msg, icon = '✨') {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 3800);
  }

  /* ---------- Buy / Cart buttons ---------- */
  document.querySelectorAll('button.btn-buy').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const title = btn.closest('[data-title]')?.dataset.title || 'cet ebook';
      showToast(`"${title}" ajouté au panier !`, '🛒');
      btn.textContent = '✓ Ajouté au panier';
      btn.style.background = 'linear-gradient(135deg,#2a6e2a,#3a8e3a)';
      setTimeout(() => {
        btn.innerHTML = '🛒 Acheter maintenant';
        btn.style.background = '';
      }, 2800);
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
      btn.innerHTML = '⏳ Envoi...';
      btn.disabled = true;

      if (db) {
        const { data, error } = await db
          .from('subscribers')
          .insert({ email, source: 'newsletter' });

        if (error) {
          console.error('[Supabase] ❌ Newsletter insert error:', {
            message : error.message,
            code    : error.code,
            details : error.details,
            hint    : error.hint,
            status  : error.status,
          });
          if (error.code === '23505') {
            showToast('Vous êtes déjà abonné(e) à notre newsletter !', 'ℹ️');
          } else {
            showToast(`Erreur [${error.code || error.status}] : ${error.message}`, '❌');
          }
        } else {
          console.log('[Supabase] ✅ Subscriber saved:', data);
          showToast('Merci ! Bienvenue dans le Cercle Mystique ✨', '📜');
          input.value = '';
        }
      } else {
        showToast('Merci ! Vous êtes maintenant abonné(e).', '📜');
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
      btn.innerHTML = '⏳ Envoi en cours...';
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
          console.error('[Supabase] ❌ Contact insert error:', {
            message : error.message,
            code    : error.code,
            details : error.details,
            hint    : error.hint,
            status  : error.status,
          });
          showToast(`Erreur [${error.code || error.status}] : ${error.message}`, '❌');
        } else {
          console.log('[Supabase] ✅ Contact saved:', data);
          showToast('Message envoyé ! Nous vous répondrons sous 48h.', '📬');
          contactForm.reset();
        }
      } else {
        showToast('Message envoyé ! Nous vous répondrons sous 48h.', '📬');
        contactForm.reset();
      }

      btn.innerHTML = originalHtml;
      btn.disabled = false;
    });
  }

  /* ---------- Animated counters ---------- */
  const counters = document.querySelectorAll('.counter');
  if (counters.length) {
    const cObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el  = entry.target;
        const end = parseInt(el.dataset.target, 10);
        const dur = 2000;
        const step = end / (dur / 16);
        let val = 0;
        const timer = setInterval(() => {
          val += step;
          if (val >= end) { val = end; clearInterval(timer); }
          el.textContent = Math.floor(val).toLocaleString('fr-FR') + (el.dataset.suffix || '');
        }, 16);
        cObserver.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(c => cObserver.observe(c));
  }

});
