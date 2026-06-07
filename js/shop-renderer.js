/* ================================================================
   DURGA DESIGNS — SHOP RENDERER (Stage 1: catalogue/enquiry only)
   ================================================================
   Reads SHOP_CATEGORIES / SHOP_PRODUCTS from js/shop-catalogue.js
   and injects HTML into the new /shop pages and product.html.

   This file is intentionally separate from js/media-renderer.js
   so the existing collections/gallery/homepage rendering pipeline
   is left completely untouched.

   Pages call:  ShopRender.categoryGrid('container-id')
                ShopRender.productGrid('container-id', 'bags')
                ShopRender.productDetail('container-id')
   ================================================================ */

const ShopRender = (() => {

  const WA_NUM  = (typeof DD_CONFIG !== 'undefined') ? DD_CONFIG.contact.whatsapp : '447907975847';
  const WA_BASE = `https://wa.me/${WA_NUM}?text=`;

  const WA_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

  /* ── Branded "photography coming soon" placeholder ──────────
     Used whenever a product/category has no photo yet — honest,
     on-brand (navy → gold gradient), never a fake product photo. */
  function shopPlaceholder(icon, label) {
    return `<div class="shop-placeholder" aria-hidden="true">
        <span class="shop-placeholder-icon">${icon}</span>
        <span class="shop-placeholder-label">${label}</span>
        <span class="shop-placeholder-sub">Photography coming soon</span>
      </div>`;
  }

  function safeSrc(path) {
    if (!path) return '';
    return encodeURI(path);
  }

  function imageOrPlaceholder(src, alt, icon, label) {
    if (!src) return shopPlaceholder(icon, label);
    return `<img src="${safeSrc(src)}" alt="${alt}" loading="lazy" decoding="async"
              onerror="this.style.display='none'; var n=this.nextElementSibling; if(n) n.style.display='flex';"
              style="width:100%;height:100%;object-fit:cover;display:block;" />` +
      `<div class="shop-placeholder" aria-hidden="true" style="display:none;">
         <span class="shop-placeholder-icon">${icon}</span>
         <span class="shop-placeholder-label">${label}</span>
         <span class="shop-placeholder-sub">Photography coming soon</span>
       </div>`;
  }

  function stockBadge(status) {
    const label = SHOP_STOCK_LABELS[status] || 'Details on request';
    const cls   = 'stock-badge stock-' + (status || 'preorder');
    return `<span class="${cls}">${label}</span>`;
  }

  function priceLabel(price) {
    return price ? price : 'Price on request';
  }

  /* ── 1. CATEGORY GRID — used on shop/index.html ─────────────── */
  function categoryGrid(containerId, basePath) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const prefix = basePath || '';

    el.innerHTML = SHOP_CATEGORIES.map(cat => `
      <a href="${prefix}${cat.page.replace(/^shop\//, '')}" class="shop-category-card">
        <div class="shop-category-card-img">
          ${shopPlaceholder(cat.icon, cat.shortTitle)}
        </div>
        <div class="shop-category-card-body">
          <h3 class="shop-category-card-title">${cat.title}</h3>
          <p class="shop-category-card-desc">${cat.description}</p>
          <span class="shop-category-card-link">Browse ${cat.shortTitle} →</span>
        </div>
      </a>`.trim()).join('');
  }

  /* ── 2. PRODUCT CARD ─────────────────────────────────────────
     `productHref` lets each page point at product.html with the
     correct relative path (root vs. /shop/<cat>/ depth).        */
  function buildCard(p, productHref) {
    const cat   = SHOP_CATEGORY_MAP[p.category];
    const badge = p.badge ? `<span class="product-card-badge">${p.badge}</span>` : '';
    const img   = imageOrPlaceholder(p.image, p.title, cat ? cat.icon : '✨', cat ? cat.shortTitle : '');

    return `
      <a href="${productHref}?slug=${encodeURIComponent(p.slug)}" class="product-card shop-product-card" data-category="${p.category}">
        <div class="product-card-img">
          ${badge}
          ${img}
        </div>
        <div class="product-card-body">
          <span class="product-card-category">${cat ? cat.shortTitle : ''}</span>
          <h3 class="product-card-title">${p.title}</h3>
          <div class="product-card-footer">
            <span class="product-card-price">${priceLabel(p.price)}</span>
            ${stockBadge(p.stockStatus)}
          </div>
        </div>
      </a>`.trim();
  }

  /* ── 3. PRODUCT GRID — used on each /shop/<category>/ page ──── */
  function productGrid(containerId, categorySlug, opts) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const productHref = (opts && opts.productHref) || '../../product.html';

    let items = getActiveShopProducts(categorySlug);
    if (opts && opts.subType) {
      items = items.filter(p => p.subType === opts.subType);
    }

    if (!items.length) {
      el.innerHTML = `<p class="shop-empty-msg">New pieces are being prepared for this collection — message us on WhatsApp and we'll let you know as soon as they're ready.</p>`;
      return;
    }
    el.innerHTML = items.map(p => buildCard(p, productHref)).join('');
  }

  /* ── 4. PRODUCT DETAIL — used on product.html ─────────────────
     Reads ?slug= from the URL.                                   */
  function productDetail(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const params = new URLSearchParams(window.location.search);
    const slug   = params.get('slug');
    const p      = slug ? getShopProductBySlug(slug) : null;

    if (!p) {
      el.innerHTML = `
        <div class="shop-not-found">
          <h1>Product not found</h1>
          <p>This product may have been moved or is no longer listed. Browse our current collections below, or message us on WhatsApp — we're happy to help you find what you're looking for.</p>
          <div class="btn-group btn-group-center">
            <a href="shop/index.html" class="btn btn-gold">Browse the Shop</a>
            <a href="${WA_BASE}${encodeURIComponent('Hi Durga Designs, I am looking for a specific handmade item. Can you help?')}" class="btn btn-whatsapp" target="_blank" rel="noopener">${WA_SVG} WhatsApp Us</a>
          </div>
        </div>`;
      document.title = 'Product Not Found | Durga Designs';
      return;
    }

    const cat   = SHOP_CATEGORY_MAP[p.category];
    const waMsg = shopWaMessage(p.title.replace(/&amp;/g, '&'));
    const waUrl = WA_BASE + encodeURIComponent(waMsg);
    const img   = imageOrPlaceholder(p.image, p.title, cat ? cat.icon : '✨', cat ? cat.shortTitle : '');

    const detailRow = (label, value) => value
      ? `<div class="shop-detail-row"><span class="shop-detail-label">${label}</span><span class="shop-detail-value">${value}</span></div>`
      : '';

    el.innerHTML = `
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="index.html">Home</a>
        <span>›</span>
        <a href="shop/index.html">Shop</a>
        <span>›</span>
        ${cat ? `<a href="${cat.page}">${cat.shortTitle}</a><span>›</span>` : ''}
        <span>${p.title}</span>
      </nav>

      <div class="product-detail-grid">
        <div class="product-detail-media">
          <div class="product-detail-media-main">${img}</div>
        </div>

        <div class="product-detail-info">
          ${cat ? `<span class="product-card-category">${cat.shortTitle}</span>` : ''}
          <h1 class="product-detail-title">${p.title}</h1>

          <div class="product-detail-meta">
            <span class="product-detail-price">${priceLabel(p.price)}</span>
            ${stockBadge(p.stockStatus)}
          </div>

          <p class="product-detail-short">${p.shortDescription}</p>

          <div class="shop-detail-table">
            ${detailRow('Colour', p.colour || 'Details available on request')}
            ${detailRow('Material', p.material || 'Details available on request')}
            ${detailRow('Dimensions / Size', p.dimensions || 'Details available on request')}
          </div>

          <a href="${waUrl}" class="btn btn-whatsapp btn-lg btn-full shop-enquire-btn" target="_blank" rel="noopener" aria-label="Enquire about ${p.title} on WhatsApp">
            ${WA_SVG} Enquire on WhatsApp
          </a>

          <p class="shop-handmade-disclaimer">${SHOP_HANDMADE_DISCLAIMER}</p>
        </div>
      </div>

      <div class="product-detail-extra">
        <div class="product-detail-extra-block">
          <h2>About This Piece</h2>
          <p>${p.longDescription}</p>
        </div>
        <div class="product-detail-extra-block">
          <h2>The Artisan Story</h2>
          <p>${p.story}</p>
        </div>
      </div>

      <div class="cta-banner section-pad-sm shop-detail-cta">
        <div class="container cta-banner-content">
          <h2>Have a Question About This Piece?</h2>
          <p>Every item is handmade — message us with your delivery postcode and any questions about size, colour or timing, and we'll confirm availability.</p>
          <div class="btn-group btn-group-center">
            <a href="${waUrl}" class="btn btn-whatsapp" target="_blank" rel="noopener">${WA_SVG} WhatsApp About This Item</a>
            <a href="shop/index.html" class="btn btn-outline-gold">Continue Browsing</a>
          </div>
        </div>
      </div>
    `;

    document.title = `${p.title.replace(/&amp;/g, '&')} | Durga Designs Shop`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', p.shortDescription);
  }

  return { categoryGrid, productGrid, productDetail };

})();
