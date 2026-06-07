/* ================================================================
   DURGA DESIGNS — LOCAL BASKET / CART (Stage 2)
   ================================================================
   Pure front-end basket using localStorage. NO backend, NO Stripe,
   NO payment processing — this stage only lets a customer collect
   items locally before messaging us / proceeding to checkout later.

   Storage shape (localStorage key DD_CART_KEY):
     [
       {
         slug, title, category, categoryLabel,
         price        : number|null   (null = "Price on request")
         image        : string|null
         placeholderIcon, placeholderLabel,
         qty          : integer >= 1
       }, ...
     ]

   Public API (window.DDCart):
     getItems()
     addItem(item)
     updateQty(slug, qty)
     removeItem(slug)
     clearCart()
     getCount()
     getSubtotal()      → { amount, hasPriceOnRequest, allUnknown }
     formatPrice(n)
     renderBadge()      → updates any [data-cart-count] elements on the page
     injectNavLink()    → adds a basket icon/link into navbar-cta / mobile-menu-cta
   ================================================================ */

const DDCart = (() => {

  const DD_CART_KEY = 'dd_cart_v1';

  /* ── storage helpers ─────────────────────────────────────────── */
  function getItems() {
    try {
      const raw = localStorage.getItem(DD_CART_KEY);
      const items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    } catch (e) {
      return [];
    }
  }

  function saveItems(items) {
    try {
      localStorage.setItem(DD_CART_KEY, JSON.stringify(items));
    } catch (e) { /* localStorage unavailable — fail silently, cart simply won't persist */ }
    renderBadge();
  }

  /* ── mutations ───────────────────────────────────────────────── */
  function addItem(item) {
    if (!item || !item.slug) return;
    const items = getItems();
    const existing = items.find(i => i.slug === item.slug);
    if (existing) {
      existing.qty = (existing.qty || 1) + (item.qty || 1);
    } else {
      items.push({
        slug:            item.slug,
        title:           item.title || 'Item',
        category:        item.category || '',
        categoryLabel:   item.categoryLabel || '',
        price:           (typeof item.price === 'number') ? item.price : null,
        image:           item.image || null,
        placeholderIcon:  item.placeholderIcon || '✨',
        placeholderLabel: item.placeholderLabel || '',
        qty:             item.qty || 1
      });
    }
    saveItems(items);
    return items;
  }

  function updateQty(slug, qty) {
    let items = getItems();
    qty = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
    items = items.map(i => i.slug === slug ? { ...i, qty } : i);
    saveItems(items);
    return items;
  }

  function removeItem(slug) {
    const items = getItems().filter(i => i.slug !== slug);
    saveItems(items);
    return items;
  }

  function clearCart() {
    saveItems([]);
  }

  /* ── derived values ──────────────────────────────────────────── */
  function getCount() {
    return getItems().reduce((sum, i) => sum + (i.qty || 1), 0);
  }

  // Returns subtotal info. Items with price:null are "Price on request"
  // and are EXCLUDED from the numeric subtotal — we never invent a price.
  function getSubtotal() {
    const items = getItems();
    let amount = 0;
    let known = 0;
    let unknown = 0;
    items.forEach(i => {
      if (typeof i.price === 'number') {
        amount += i.price * (i.qty || 1);
        known++;
      } else {
        unknown++;
      }
    });
    return {
      amount,
      hasPriceOnRequest: unknown > 0,
      allUnknown: known === 0 && unknown > 0
    };
  }

  function formatPrice(n) {
    if (typeof n !== 'number') return 'Price on request';
    return '£' + n.toFixed(2);
  }

  /* ── basket badge (nav icon count) ───────────────────────────── */
  function renderBadge() {
    const count = getCount();
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = count > 0 ? String(count) : '';
      el.style.display = count > 0 ? '' : 'none';
    });
  }

  const BAG_SVG = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;

  // Adds a small basket link with a live count badge into the desktop
  // navbar-cta and the mobile menu cta block — but only if those
  // containers exist AND a basket link isn't already present, so this
  // is safe to call on any page that includes this script.
  function injectNavLink() {
    const desktopCta = document.querySelector('.navbar-cta');
    const mobileCta  = document.querySelector('.mobile-menu-cta');

    function buildLink(extraClass) {
      const a = document.createElement('a');
      a.href = computeCartHref();
      a.className = 'btn btn-outline-gold btn-sm dd-basket-link ' + (extraClass || '');
      a.setAttribute('aria-label', 'View basket');
      a.innerHTML = `${BAG_SVG} <span>Basket</span> <span class="dd-basket-badge" data-cart-count></span>`;
      return a;
    }

    if (desktopCta && !desktopCta.querySelector('.dd-basket-link')) {
      desktopCta.appendChild(buildLink());
    }
    if (mobileCta && !mobileCta.querySelector('.dd-basket-link')) {
      mobileCta.appendChild(buildLink('btn-full'));
    }
    renderBadge();
  }

  // Works out the relative path to cart.html based on current page depth.
  function computeCartHref() {
    const path = window.location.pathname;
    // crude depth check: count "/" after the site root, ignoring trailing filename
    const parts = path.split('/').filter(Boolean);
    // remove the filename itself
    parts.pop();
    // if we're inside e.g. /shop/bags/ → depth 2 → ../../cart.html
    // if we're inside e.g. /shop/ → depth 1 → ../cart.html
    // if we're at root → cart.html
    // Heuristic based on known site structure: look for "shop" segment.
    const shopIdx = parts.indexOf('shop');
    if (shopIdx === -1) return 'cart.html';
    const depthInsideShop = parts.length - shopIdx; // shop/ = 1, shop/bags/ = 2
    return '../'.repeat(depthInsideShop) + 'cart.html';
  }

  /* ── full cart page renderer (used by cart.html) ────────────── */
  function imgOrPlaceholder(item) {
    if (item.image) {
      return `<img src="${encodeURI(item.image)}" alt="${item.title}" loading="lazy" decoding="async"
                onerror="this.style.display='none'; var n=this.nextElementSibling; if(n) n.style.display='flex';"
                style="width:100%;height:100%;object-fit:cover;display:block;" />
              <div class="shop-placeholder" aria-hidden="true" style="display:none;">
                <span class="shop-placeholder-icon">${item.placeholderIcon || '✨'}</span>
                <span class="shop-placeholder-label">${item.placeholderLabel || ''}</span>
                <span class="shop-placeholder-sub">Photography coming soon</span>
              </div>`;
    }
    return `<div class="shop-placeholder" aria-hidden="true">
              <span class="shop-placeholder-icon">${item.placeholderIcon || '✨'}</span>
              <span class="shop-placeholder-label">${item.placeholderLabel || ''}</span>
              <span class="shop-placeholder-sub">Photography coming soon</span>
            </div>`;
  }

  function renderCartPage(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    function draw() {
      const items = getItems();

      if (!items.length) {
        el.innerHTML = `
          <div class="dd-cart-empty">
            <h1>Your Basket</h1>
            <p>Your basket is empty. Browse the Artisan Shop to find a handmade piece you love.</p>
            <div class="btn-group btn-group-center">
              <a href="shop/index.html" class="btn btn-gold btn-lg">Browse the Shop</a>
              <a href="collections.html" class="btn btn-outline-gold btn-lg">Browse Collections</a>
            </div>
          </div>`;
        return;
      }

      const subtotal = getSubtotal();

      const rows = items.map(item => `
        <div class="dd-cart-row" data-cart-row data-slug="${item.slug}">
          <div class="dd-cart-row-img">${imgOrPlaceholder(item)}</div>
          <div class="dd-cart-row-body">
            <span class="product-card-category">${item.categoryLabel || ''}</span>
            <h3 class="dd-cart-row-title">${item.title}</h3>
            <span class="dd-cart-row-price">${formatPrice(item.price)}</span>
          </div>
          <div class="dd-cart-row-qty">
            <button type="button" class="dd-qty-btn" data-qty-decrease aria-label="Decrease quantity of ${item.title}">−</button>
            <input type="number" class="dd-qty-input" min="1" max="99" value="${item.qty}" data-qty-input aria-label="Quantity for ${item.title}" />
            <button type="button" class="dd-qty-btn" data-qty-increase aria-label="Increase quantity of ${item.title}">+</button>
          </div>
          <div class="dd-cart-row-linetotal">
            ${typeof item.price === 'number' ? formatPrice(item.price * item.qty) : 'Price on request'}
          </div>
          <button type="button" class="dd-cart-remove" data-remove-item aria-label="Remove ${item.title} from basket">Remove</button>
        </div>`).join('');

      const subtotalLine = subtotal.allUnknown
        ? `<span>Price on request — message us on WhatsApp for a quote</span>`
        : `<span>${formatPrice(subtotal.amount)}${subtotal.hasPriceOnRequest ? ' <em>+ items priced on request</em>' : ''}</span>`;

      el.innerHTML = `
        <div class="dd-cart-header">
          <h1>Your Basket</h1>
          <p>${getCount()} item${getCount() === 1 ? '' : 's'} in your basket. Prices shown are estimates where available — every piece is handmade, so we'll always confirm final availability and pricing with you directly.</p>
        </div>

        <div class="dd-cart-rows">${rows}</div>

        <div class="dd-cart-summary">
          <div class="dd-cart-summary-row">
            <span>Subtotal</span>
            ${subtotalLine}
          </div>
          <div class="dd-cart-summary-row">
            <span>Delivery</span>
            <span>Calculated at checkout</span>
          </div>
          <div class="dd-cart-summary-row dd-cart-summary-total">
            <span>Total</span>
            <span>${subtotal.allUnknown ? 'Price on request' : formatPrice(subtotal.amount) + (subtotal.hasPriceOnRequest ? ' + items on request' : '')}</span>
          </div>

          <button type="button" class="btn btn-gold btn-lg btn-full" disabled aria-disabled="true" title="Checkout is coming in the next stage">
            Checkout — coming next
          </button>
          <p class="dd-cart-checkout-note">Online checkout isn't live yet. To place an order now, message us on WhatsApp with your basket items and we'll confirm pricing, availability and delivery.</p>
          <a href="${WA_BASE_FOR_CART()}" class="btn btn-whatsapp btn-lg btn-full" target="_blank" rel="noopener">${BAG_SVG} Enquire About My Basket on WhatsApp</a>

          <button type="button" class="dd-cart-clear" data-clear-cart>Clear basket</button>
        </div>`;

      wireRowEvents();
    }

    function wireRowEvents() {
      el.querySelectorAll('[data-cart-row]').forEach(row => {
        const slug = row.dataset.slug;
        const decBtn = row.querySelector('[data-qty-decrease]');
        const incBtn = row.querySelector('[data-qty-increase]');
        const input  = row.querySelector('[data-qty-input]');
        const removeBtn = row.querySelector('[data-remove-item]');

        decBtn.addEventListener('click', () => {
          const current = parseInt(input.value, 10) || 1;
          updateQty(slug, current - 1);
          draw();
        });
        incBtn.addEventListener('click', () => {
          const current = parseInt(input.value, 10) || 1;
          updateQty(slug, current + 1);
          draw();
        });
        input.addEventListener('change', () => {
          updateQty(slug, input.value);
          draw();
        });
        removeBtn.addEventListener('click', () => {
          removeItem(slug);
          draw();
        });
      });

      const clearBtn = el.querySelector('[data-clear-cart]');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          if (confirm('Remove all items from your basket?')) {
            clearCart();
            draw();
          }
        });
      }
    }

    draw();

    // keep this page in sync if the cart changes in another tab
    window.addEventListener('storage', (e) => {
      if (e.key === DD_CART_KEY) draw();
    });
  }

  function WA_BASE_FOR_CART() {
    const num = (typeof DD_CONFIG !== 'undefined') ? DD_CONFIG.contact.whatsapp : '447907975847';
    const items = getItems();
    const lines = items.map(i => `• ${i.title} (x${i.qty})${typeof i.price === 'number' ? ' — ' + formatPrice(i.price * i.qty) : ' — price on request'}`);
    const msg = `Hi Durga Designs, I'd like to ask about these items in my basket:\n${lines.join('\n')}\n\nCould you confirm availability, pricing and delivery?`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  }

  /* ── cross-tab sync ──────────────────────────────────────────── */
  window.addEventListener('storage', (e) => {
    if (e.key === DD_CART_KEY) renderBadge();
  });

  document.addEventListener('DOMContentLoaded', () => {
    injectNavLink();
    renderBadge();
  });

  return {
    getItems, addItem, updateQty, removeItem, clearCart,
    getCount, getSubtotal, formatPrice,
    renderBadge, injectNavLink, renderCartPage
  };

})();
