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

// ── Enquiry Form Submission ────────────────────────────────
(function initEnquiryForm() {
  const form = document.getElementById('enquiryForm');
  if (!form) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    const data    = new FormData(form);
    const name    = data.get('name') || '';
    const phone   = data.get('phone') || '';
    const item    = data.get('item') || 'General enquiry';
    const message = data.get('message') || '';

    const waMsg = `Hi Durga Designs, my name is ${name}. ` +
      `I am enquiring about: ${item}. ${message ? message + ' ' : ''}` +
      `My contact number is: ${phone}.`;

    const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMsg)}`;

    // Show success message
    const successBox = document.getElementById('formSuccess');
    if (successBox) {
      form.style.display = 'none';
      successBox.classList.add('visible');
    }

    // Open WhatsApp after short delay
    setTimeout(() => window.open(waUrl, '_blank'), 600);
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
