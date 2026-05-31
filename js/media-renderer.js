/* ================================================================
   DURGA DESIGNS — MEDIA RENDERER
   ================================================================
   Reads DD_ASSETS from media-map.js and injects images/videos
   into the correct containers on each page.

   You should NOT need to edit this file to add or change images.
   Edit media-map.js instead.

   HOW PAGES USE THIS:
   Each HTML page includes these two scripts and then calls
   DDRender.page('page-name') to trigger the right render jobs.

   <script src="js/media-map.js"></script>
   <script src="js/media-renderer.js"></script>
   <script>DDRender.page('home');</script>
   ================================================================ */

const DDRender = (() => {

  /* ── Constants ─────────────────────────────────────────────── */
  const WA_BASE    = 'https://wa.me/447907975847?text=';
  const WA_GENERAL = WA_BASE + encodeURIComponent('Hi Durga Designs, I would like to enquire.');
  const WA_SVG     = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

  /* ── Path helper: encodes spaces/special chars in file paths ─ */
  function safeSrc(path) {
    if (!path) return '';
    // encodeURI encodes spaces → %20 but preserves / . - _
    return encodeURI(path);
  }

  /* ── Image error handler — prevents broken-image icons ────── */
  function addImgErrorHandler(img, emoji, label) {
    img.addEventListener('error', () => {
      // If image fails to load, swap to a clean styled placeholder
      const ph = document.createElement('div');
      ph.setAttribute('aria-hidden', 'true');
      ph.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.5rem;font-size:2rem;opacity:0.35;background:linear-gradient(135deg,#0A1B33,#102544);';
      ph.innerHTML = `${emoji}<span style="font-size:0.65rem;font-family:var(--font-body);color:rgba(212,175,55,0.6);">${label}</span>`;
      if (img.parentNode) img.parentNode.replaceChild(ph, img);
    }, { once: true });
  }

  /* ── Premium placeholder — textile crosshatch pattern ─────── */
  const PH_BG   = 'linear-gradient(145deg,#0d1e35 0%,#162844 100%)';
  const PH_PAT  = "url(\"data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0L10 10M10 0L0 10' stroke='rgba(212%2C175%2C55%2C0.07)' stroke-width='1'/%3E%3C/svg%3E\")";
  const PH_INNER = (emoji, label) =>
    `<span style="font-size:1.8rem;position:relative;opacity:0.55;" aria-hidden="true">${emoji}</span>` +
    `<span style="font-family:'Playfair Display',serif;font-size:0.65rem;color:rgba(212,175,55,0.55);letter-spacing:0.12em;text-transform:uppercase;position:relative;">${label}</span>`;

  /* ── Build img element with lazy loading + error handler ───── */
  function makeImg(src, alt, emoji, label, eager) {
    const phStyle = `display:none;width:100%;height:100%;flex-direction:column;align-items:center;justify-content:center;gap:0.65rem;background:${PH_BG};background-image:${PH_PAT};`;
    return `<img src="${safeSrc(src)}" alt="${alt}" loading="${eager ? 'eager' : 'lazy'}" decoding="async" onerror="this.style.display='none';var n=this.nextSibling;if(n)n.style.display='flex';" style="width:100%;height:100%;object-fit:cover;display:block;" />` +
      `<div aria-hidden="true" style="${phStyle}">${PH_INNER(emoji, label)}</div>`;
  }

  /* ── Fallback placeholder (no src at all) ──────────────────── */
  function placeholderDiv(emoji, label) {
    return `<div class="img-placeholder" aria-hidden="true" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.65rem;background:${PH_BG};background-image:${PH_PAT};">${PH_INNER(emoji, label)}</div>`;
  }

  /* ── Category emoji map ─────────────────────────────────────── */
  const EMOJI = {
    abayas:       '🧕',
    'ladies-suits': '👗',
    unstitched:   '🪡',
    sarees:       '🥻',
    'laces-buttons':'🧵',
    kids:         '👧',
    modern:       '✨',
    tailoring:    '✂️',
    boutique:     '🏪',
    suits:        '👗',
  };

  /* ── Logo injection ──────────────────────────────────────────── */
  function injectLogo() {
    if (!DD_ASSETS.logo) return;
    const logo   = DD_ASSETS.logo.main;                                   // logo-small.png
    const logoLg = { src: 'images/optimized/logo.png', alt: logo.alt }; // logo.png for footer

    // Navbar — small optimised PNG
    document.querySelectorAll('.navbar-logo').forEach(el => {
      const mainEl = el.querySelector('.logo-main');
      if (mainEl && !mainEl.querySelector('img')) {
        mainEl.innerHTML = `<img src="${safeSrc(logo.src)}" alt="${logo.alt}" style="height:36px;width:auto;max-width:160px;object-fit:contain;" loading="eager" decoding="async" width="140" height="36" />`;
      }
    });

    // Footer — slightly larger PNG
    document.querySelectorAll('.footer-brand').forEach(el => {
      const mainEl = el.querySelector('.logo-main');
      if (mainEl && !mainEl.querySelector('img')) {
        mainEl.innerHTML = `<img src="${safeSrc(logoLg.src)}" alt="${logoLg.alt}" style="height:40px;width:auto;max-width:180px;object-fit:contain;" loading="lazy" decoding="async" width="180" height="40" />`;
      }
    });
  }

  /* ── CATEGORY GRID (homepage + collections header) ──────────── */
  function renderCategories(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const active = DD_ASSETS.categories
      .filter(c => c.active)
      .sort((a, b) => a.order - b.order);

    el.innerHTML = active.map(cat => {
      const imgHtml = cat.cover
        ? makeImg(cat.cover, cat.coverAlt, EMOJI[cat.slug] || '✨', cat.title, false)
        : placeholderDiv(EMOJI[cat.slug] || '✨', cat.title);

      const waLink = cat.slug === 'tailoring'
        ? `href="misha-tailoring.html"`
        : `href="${cat.link}"`;

      return `
        <a ${waLink} class="category-card">
          <div class="category-card-img">${imgHtml}</div>
          <div class="category-card-body">
            <h3 class="category-card-title">${cat.title}</h3>
            <p class="category-card-desc">${cat.description}</p>
            <span class="category-card-link">${cat.cta} →</span>
          </div>
        </a>`.trim();
    }).join('');
  }

  /* ── PRODUCT CARD HTML ──────────────────────────────────────── */
  function buildProductCard(p) {
    const waUrl    = WA_BASE + encodeURIComponent(p.whatsappMsg);
    const badgeHtml = p.badge
      ? `<span class="product-card-badge">${p.badge}</span>`
      : '';
    const imgHtml = p.src
      ? makeImg(p.src, p.alt, EMOJI[p.category] || '✨', p.categoryLabel, false)
      : placeholderDiv(EMOJI[p.category] || '✨', p.categoryLabel);

    return `
      <div class="product-card" data-category="${p.category}">
        <div class="product-card-img">
          ${badgeHtml}
          ${imgHtml}
        </div>
        <div class="product-card-body">
          <span class="product-card-category">${p.categoryLabel}</span>
          <h3 class="product-card-title">${p.title}</h3>
          <div class="product-card-footer">
            <span class="product-card-price">${p.price || 'Ask for price'}</span>
            <a href="${waUrl}" class="product-card-wa" target="_blank" rel="noopener" aria-label="Ask about ${p.title} on WhatsApp">
              ${WA_SVG} Ask
            </a>
          </div>
        </div>
      </div>`.trim();
  }

  /* ── NEW ARRIVALS (homepage) — featured products only ───────── */
  function renderHomeArrivals(containerId, limit) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const featured = DD_ASSETS.products
      .filter(p => p.active && p.featured)
      .sort((a, b) => {
        // Sort by category order first, then by product order
        const catOrder = { abayas:1, 'ladies-suits':2, unstitched:3, 'laces-buttons':4 };
        const catA = catOrder[a.category] || 99;
        const catB = catOrder[b.category] || 99;
        return catA !== catB ? catA - catB : a.order - b.order;
      })
      .slice(0, limit || 8);

    el.innerHTML = featured.map(buildProductCard).join('');
  }

  /* ── COLLECTIONS GRID — all active products, filter-ready ──── */
  function renderCollectionsGrid(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const active = DD_ASSETS.products
      .filter(p => p.active)
      .sort((a, b) => {
        const catOrder = { abayas:1, 'ladies-suits':2, unstitched:3, 'laces-buttons':4, sarees:5, kids:6, modern:7 };
        const catA = catOrder[a.category] || 99;
        const catB = catOrder[b.category] || 99;
        return catA !== catB ? catA - catB : a.order - b.order;
      });

    el.innerHTML = active.map(buildProductCard).join('');

    // Re-wire filter tabs now that content is rendered
    wireFilterTabs();
  }

  /* ── Re-wire filter tabs after dynamic content is injected ──── */
  function wireFilterTabs() {
    const tabs  = document.querySelectorAll('.filter-tab');
    const cards = document.querySelectorAll('[data-category]');
    if (!tabs.length) return;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const filter = tab.dataset.filter;
        cards.forEach(card => {
          card.style.display = (filter === 'all' || card.dataset.category === filter) ? '' : 'none';
        });
      });
    });
  }

  /* ── GALLERY GRID ───────────────────────────────────────────── */
  function renderGallery(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const items = DD_ASSETS.gallery
      .filter(g => g.active)
      .sort((a, b) => a.order - b.order);

    el.innerHTML = items.map(g => `
      <div class="gallery-item" data-category="${g.section}" aria-label="${g.alt}">
        ${makeImg(g.src, g.alt, '🖼', g.caption || '', false)}
        <div class="gallery-item-overlay" aria-hidden="true"></div>
        ${g.caption ? `<div class="gallery-item-caption">${g.caption}</div>` : ''}
      </div>`.trim()
    ).join('');

    // Re-wire gallery filter tabs
    wireFilterTabs();
  }

  /* ── REELS SECTION ──────────────────────────────────────────── */
  function renderReels(containerId, featuredOnly) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const reels = DD_ASSETS.reels
      .filter(r => r.active && (!featuredOnly || r.featured))
      .sort((a, b) => a.order - b.order);

    if (!reels.length) {
      el.closest('.reels-section')?.style.setProperty('display', 'none');
      return;
    }

    el.innerHTML = reels.map(r => {
      const posterHtml = r.poster
        ? `<img class="reel-poster" src="${safeSrc(r.poster)}" alt="${r.alt}" loading="lazy" />`
        : `<div class="reel-poster-placeholder" aria-hidden="true"><div class="reel-logo-mark">D</div></div>`;

      return `
        <div class="reel-card" data-video-src="${safeSrc(r.src)}" aria-label="${r.alt}">
          <div class="reel-preview">
            ${posterHtml}
            <div class="reel-overlay" aria-hidden="true">
              <button class="reel-play-btn" aria-label="Play ${r.title}">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </button>
            </div>
            <div class="reel-meta" aria-hidden="true">
              <span class="reel-label">▶ REEL</span>
              <span class="reel-title-text">${r.title}</span>
            </div>
          </div>
          <div class="reel-video-container" hidden>
            <!-- Video is lazy-loaded on click to keep page fast -->
          </div>
        </div>`.trim();
    }).join('');

    // Attach click-to-play behaviour
    el.querySelectorAll('.reel-card').forEach(card => {
      const previewEl   = card.querySelector('.reel-preview');
      const videoContainer = card.querySelector('.reel-video-container');
      const videoSrc    = card.dataset.videoSrc;

      card.querySelector('.reel-play-btn').addEventListener('click', () => {
        // Lazily create the video element only when the user clicks
        if (!videoContainer.querySelector('video')) {
          const video = document.createElement('video');
          video.src        = videoSrc;
          video.muted      = true;
          video.controls   = true;
          video.playsInline = true;
          video.autoplay   = false;
          video.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:inherit;';
          videoContainer.appendChild(video);
          videoContainer.removeAttribute('hidden');
          previewEl.style.display = 'none';
          video.play().catch(() => {}); // play, ignore any autoplay policy rejection
        }
      });
    });
  }

  /* ── ABOUT PAGE — shop image ────────────────────────────────── */
  function renderAboutImage(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const shop = DD_ASSETS.shop.find(s => s.id === 'inside-shop-1' && s.active)
              || DD_ASSETS.shop.find(s => s.active);
    if (!shop) return;

    el.innerHTML = `<img src="${safeSrc(shop.src)}" alt="${shop.alt}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" />`;
    el.classList.remove('about-img'); // let the img fill naturally
    el.style.padding = '0';
  }

  /* ── TAILORING PAGE — shop image ────────────────────────────── */
  function renderTailoringImage(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const shop = DD_ASSETS.shop.find(s => s.id === 'inside-shop-2' && s.active)
              || DD_ASSETS.shop.find(s => s.active);
    if (!shop) return;

    el.innerHTML = `<img src="${safeSrc(shop.src)}" alt="${shop.alt}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" />`;
    el.style.padding = '0';
  }

  /* ── Hero store-front overlay image ────────────────────────── */
  function renderHeroImage(containerId) {
    const el = document.getElementById(containerId);
    if (!el || !DD_ASSETS.hero.storeFront?.active) return;

    const hero = DD_ASSETS.hero.storeFront;
    el.innerHTML = `<img src="${safeSrc(hero.src)}" alt="${hero.alt}" loading="eager" style="width:100%;height:100%;object-fit:cover;opacity:0.18;" />`;
  }

  /* ── PAGE INIT — call from HTML with page name ──────────────── */
  function page(pageName) {
    // Always run these on every page
    injectLogo();

    switch (pageName) {

      case 'home':
        renderHeroImage('dd-hero-img');
        renderCategories('dd-category-grid');
        renderHomeArrivals('dd-home-arrivals', 8);
        renderReels('dd-reels-grid', true); // featured only
        break;

      case 'collections':
        renderCollectionsGrid('dd-collections-grid');
        break;

      case 'gallery':
        renderGallery('dd-gallery-grid');
        break;

      case 'about':
        renderAboutImage('dd-about-img');
        break;

      case 'tailoring':
        renderTailoringImage('dd-tailoring-img');
        break;

      case 'contact':
      case 'delivery':
      case 'privacy':
      case 'returns':
      case 'terms':
        // No image sections on these pages — logo injection only
        break;

      default:
        console.warn('[DDRender] Unknown page:', pageName);
    }
  }

  /* ── Public API ─────────────────────────────────────────────── */
  return { page, renderCategories, renderHomeArrivals, renderCollectionsGrid,
           renderGallery, renderReels, renderAboutImage, renderTailoringImage };

})();
