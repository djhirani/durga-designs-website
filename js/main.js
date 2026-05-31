/* ============================================================
   Durga Designs — Main JavaScript
   ============================================================ */

// ── Constants ──────────────────────────────────────────────
const WA_NUMBER = '447907975847';
const WA_DEFAULT = 'Hi%20Durga%20Designs%2C%20I%20would%20like%20to%20enquire.';
const WA_PRODUCT = (name) =>
  `https://wa.me/${WA_NUMBER}?text=Hi%20Durga%20Designs%2C%20I%20am%20interested%20in%3A%20${encodeURIComponent(name)}.%20Is%20it%20available%3F`;
const WA_TAILORING =
  `https://wa.me/${WA_NUMBER}?text=Hi%20Durga%20Designs%2C%20I%20would%20like%20to%20enquire%20about%20the%20Misha%20Tailoring%20service.`;
const WA_GENERAL =
  `https://wa.me/${WA_NUMBER}?text=${WA_DEFAULT}`;

// ── Navbar ─────────────────────────────────────────────────
(function initNavbar() {
  const navbar   = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  if (!navbar) return;

  // Scroll shadow
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // Mobile toggle
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const open = hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  // Close mobile menu on link click
  document.querySelectorAll('.mobile-menu a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger?.classList.remove('open');
      mobileMenu?.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // Active link highlighting
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar-links a, .mobile-menu a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
})();

// ── Sticky WhatsApp Button ─────────────────────────────────
(function initStickyWA() {
  const btn = document.getElementById('stickyWA');
  if (btn) btn.href = WA_GENERAL;
})();

// ── Product WhatsApp Links ─────────────────────────────────
document.querySelectorAll('[data-wa-product]').forEach(el => {
  const name = el.dataset.waProduct;
  el.href = WA_PRODUCT(name);
});

// ── Filter Tabs (Collections page) ────────────────────────
(function initFilterTabs() {
  const tabs  = document.querySelectorAll('.filter-tab');
  const cards = document.querySelectorAll('[data-category]');

  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.dataset.filter;
      cards.forEach(card => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.style.display = show ? '' : 'none';
      });
    });
  });
})();

// ── Enquiry Form — WhatsApp · Email · Call ─────────────────
(function initEnquiryForm() {
  const form = document.getElementById('enquiryForm');
  if (!form) return;

  // Track which submit button the visitor clicked
  let chosenAction = 'whatsapp';
  form.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => { chosenAction = btn.dataset.action; });
  });

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    const data    = new FormData(form);
    const name    = (data.get('name')    || '').trim();
    const phone   = (data.get('phone')   || '').trim();
    const emailVal= (data.get('email')   || '').trim();
    const item    = data.get('item')     || 'General enquiry';
    const message = (data.get('message') || '').trim();

    const successBox = document.getElementById('formSuccess');

    if (chosenAction === 'email') {
      // ── Email channel ─────────────────────────────────────
      const subject  = 'Enquiry from Durga Designs website';
      const bodyParts = [
        `Name: ${name}`,
        `Phone / WhatsApp: ${phone}`,
        emailVal  ? `Email: ${emailVal}` : '',
        `Enquiry about: ${item}`,
        message   ? `\nMessage:\n${message}` : '',
        '\n---\nSent from durgadesigns.co.uk'
      ].filter(Boolean).join('\n');

      const mailtoUrl = `mailto:info@durgadesigns.co.uk` +
        `?subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(bodyParts)}`;

      if (successBox) {
        form.style.display = 'none';
        successBox.classList.add('visible');
        const h = successBox.querySelector('h3');
        const p = successBox.querySelector('p');
        if (h) h.textContent = 'Your email is ready to send';
        if (p) p.textContent = 'Your email app should open with the message ready. If it does not open automatically, please email us at info@durgadesigns.co.uk.';
      }
      // Use location.href so the mailto opens in the same tab context
      setTimeout(() => { window.location.href = mailtoUrl; }, 350);

    } else {
      // ── WhatsApp channel ──────────────────────────────────
      const msgParts = [
        `Hi Durga Designs, my name is ${name}.`,
        `I am enquiring about: ${item}.`,
        message   || '',
        `My contact number is: ${phone}.`,
        emailVal  ? `My email: ${emailVal}.` : ''
      ].filter(Boolean).join(' ');

      const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msgParts)}`;

      if (successBox) {
        form.style.display = 'none';
        successBox.classList.add('visible');
        const h = successBox.querySelector('h3');
        const p = successBox.querySelector('p');
        if (h) h.textContent = 'Opening WhatsApp…';
        if (p) p.textContent = 'Your message is ready. We will get back to you as soon as possible on WhatsApp.';
      }
      setTimeout(() => window.open(waUrl, '_blank'), 600);
    }
  });
})();

// ── Tailoring Enquiry Form ─────────────────────────────────
(function initTailoringForm() {
  const form = document.getElementById('tailoringForm');
  if (!form) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    const data    = new FormData(form);
    const name    = data.get('name') || '';
    const phone   = data.get('phone') || '';
    const service = data.get('service') || 'Tailoring enquiry';
    const details = data.get('details') || '';

    const waMsg = `Hi Durga Designs (Misha Tailoring), my name is ${name}. ` +
      `I need: ${service}. Details: ${details} ` +
      `My contact number is: ${phone}.`;

    const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMsg)}`;

    const successBox = document.getElementById('tailoringFormSuccess');
    if (successBox) {
      form.style.display = 'none';
      successBox.classList.add('visible');
    }

    setTimeout(() => window.open(waUrl, '_blank'), 600);
  });
})();

// ── Cookie Consent Banner ──────────────────────────────────
(function initCookieBanner() {
  if (localStorage.getItem('dd_cookies_accepted')) return;

  const banner = document.getElementById('cookieBanner');
  if (!banner) return;

  banner.style.display = 'flex';

  document.getElementById('cookieAccept')?.addEventListener('click', () => {
    localStorage.setItem('dd_cookies_accepted', '1');
    banner.style.display = 'none';
    document.body.classList.add('cookies-accepted');
  });

  document.getElementById('cookieDecline')?.addEventListener('click', () => {
    localStorage.setItem('dd_cookies_accepted', '0');
    banner.style.display = 'none';
    document.body.classList.add('cookies-declined');
  });

  // If already accepted, mark body so sticky button sits at normal position
  const stored = localStorage.getItem('dd_cookies_accepted');
  if (stored === '1') document.body.classList.add('cookies-accepted');
  if (stored === '0') document.body.classList.add('cookies-declined');
})();

// ── Gallery Lightbox ───────────────────────────────────────
(function initLightbox() {
  const items = document.querySelectorAll('.gallery-item');
  if (!items.length) return;

  function openLightbox(img) {
    const lb = document.createElement('div');
    lb.className = 'dd-lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Image viewer');

    const full = document.createElement('img');
    full.src = img.src;
    full.alt = img.alt || 'Durga Designs gallery image';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'dd-lightbox-btn';
    closeBtn.setAttribute('aria-label', 'Close image');
    closeBtn.innerHTML = '✕';

    if (img.dataset.caption || img.closest('.gallery-item')?.querySelector('.gallery-item-caption')?.textContent) {
      const cap = document.createElement('div');
      cap.className = 'dd-lightbox-caption';
      cap.textContent = img.closest('.gallery-item')?.querySelector('.gallery-item-caption')?.textContent || '';
      lb.appendChild(cap);
    }

    lb.appendChild(full);
    lb.appendChild(closeBtn);
    document.body.appendChild(lb);
    document.body.style.overflow = 'hidden';

    const close = () => { lb.remove(); document.body.style.overflow = ''; };
    closeBtn.addEventListener('click', e => { e.stopPropagation(); close(); });
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    }, { once: true });
  }

  items.forEach(item => {
    item.style.cursor = 'zoom-in';
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      if (img && img.naturalWidth > 0) openLightbox(img);
    });
  });
})();

// ── Smooth scroll to anchor ────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ── Export helpers for inline use ─────────────────────────
window.DD = {
  waProduct:  WA_PRODUCT,
  waTailoring: WA_TAILORING,
  waGeneral:  WA_GENERAL,
};
