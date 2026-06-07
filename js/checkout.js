/* ================================================================
   DURGA DESIGNS — CHECKOUT FORM (Stage 3)
   ================================================================
   Pure front-end checkout step. NO backend, NO Stripe, NO payment
   processing — this stage only collects delivery/contact details
   locally and lets the customer send a WhatsApp enquiry referencing
   their basket. Card payment will be wired up in a later stage via
   Stripe-hosted Checkout (never collected on this site directly).

   Storage shape (localStorage key DD_CHECKOUT_KEY):
     {
       fullName, email, phone, address1, address2,
       city, postcode, country, notes
     }

   Public API (window.DDCheckout):
     getDetails()
     saveDetails(details)
     clearDetails()
     renderCheckoutPage(containerId)
   ================================================================ */

const DDCheckout = (() => {

  const DD_CHECKOUT_KEY = 'dd_checkout_v1';

  const FIELD_DEFS = [
    { key: 'fullName', label: 'Full name',           type: 'text',  required: true,  autocomplete: 'name' },
    { key: 'email',    label: 'Email address',       type: 'email', required: true,  autocomplete: 'email' },
    { key: 'phone',    label: 'Phone / WhatsApp',    type: 'tel',   required: true,  autocomplete: 'tel' },
    { key: 'address1', label: 'Address line 1',      type: 'text',  required: true,  autocomplete: 'address-line1' },
    { key: 'address2', label: 'Address line 2',      type: 'text',  required: false, autocomplete: 'address-line2' },
    { key: 'city',     label: 'City / Town',         type: 'text',  required: true,  autocomplete: 'address-level2' },
    { key: 'postcode', label: 'Postcode',            type: 'text',  required: true,  autocomplete: 'postal-code' },
    { key: 'country',  label: 'Country',             type: 'text',  required: true,  autocomplete: 'country-name' },
    { key: 'notes',    label: 'Order notes (optional)', type: 'textarea', required: false, autocomplete: 'off' }
  ];

  const DEFAULT_COUNTRY = 'United Kingdom';

  /* ── storage helpers ─────────────────────────────────────────── */
  function getDetails() {
    try {
      const raw = localStorage.getItem(DD_CHECKOUT_KEY);
      const data = raw ? JSON.parse(raw) : null;
      return (data && typeof data === 'object') ? data : {};
    } catch (e) {
      return {};
    }
  }

  function saveDetails(details) {
    try {
      localStorage.setItem(DD_CHECKOUT_KEY, JSON.stringify(details));
    } catch (e) { /* localStorage unavailable — fail silently */ }
  }

  function clearDetails() {
    try { localStorage.removeItem(DD_CHECKOUT_KEY); } catch (e) {}
  }

  /* ── validation helpers ──────────────────────────────────────── */
  function isValidEmail(value) {
    // Reasonably strict but not pedantic — local@domain.tld
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
  }

  // Light UK postcode check — accepts standard UK formats AND lets
  // through anything with at least 3 characters (so genuine unusual
  // / international postcodes are never blocked).
  function isLikelyUkPostcode(value) {
    const v = String(value || '').trim();
    if (!v) return false;
    const ukPattern = /^[A-Z]{1,2}[0-9R][0-9A-Z]?\s*[0-9][A-Z]{2}$/i;
    if (ukPattern.test(v)) return true;
    // Not a recognised UK shape — accept if it's a plausible postcode/zip length.
    return v.length >= 3 && v.length <= 12;
  }

  function formatPrice(n) {
    if (typeof n !== 'number') return 'Price on request';
    return '£' + n.toFixed(2);
  }

  /* ── WhatsApp checkout enquiry message ───────────────────────── */
  function buildWaCheckoutUrl(details, items) {
    const num = (typeof DD_CONFIG !== 'undefined') ? DD_CONFIG.contact.whatsapp : '447907975847';
    const name = (details.fullName || '').trim() || '(name not given)';
    const phone = (details.phone || '').trim() || '(phone not given)';
    const postcode = (details.postcode || '').trim() || '(postcode not given)';
    const lines = items.map(i => `• ${i.title} (x${i.qty})`);
    const msg = [
      `Hi Durga Designs, I'd like to confirm an order from my basket.`,
      ``,
      `Name: ${name}`,
      `Phone/WhatsApp: ${phone}`,
      `Postcode: ${postcode}`,
      ``,
      `Basket items:`,
      ...lines,
      ``,
      `Could you please confirm final availability and price before I proceed to payment?`
    ].join('\n');
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  }

  /* ── field markup ────────────────────────────────────────────── */
  function fieldMarkup(def, value) {
    const val = (value || '').toString().replace(/"/g, '&quot;');
    const reqAttr = def.required ? 'required aria-required="true"' : '';
    const reqMark = def.required ? ' <span class="dd-field-required" aria-hidden="true">*</span>' : '';
    let control;
    if (def.type === 'textarea') {
      control = `<textarea id="dd-field-${def.key}" name="${def.key}" rows="3" autocomplete="${def.autocomplete}" ${reqAttr}>${val}</textarea>`;
    } else {
      control = `<input type="${def.type}" id="dd-field-${def.key}" name="${def.key}" value="${val}" autocomplete="${def.autocomplete}" ${reqAttr} />`;
    }
    return `
      <div class="dd-checkout-field" data-field="${def.key}">
        <label for="dd-field-${def.key}">${def.label}${reqMark}</label>
        ${control}
        <p class="dd-field-error" data-field-error aria-live="polite"></p>
      </div>`;
  }

  /* ── full checkout page renderer (used by checkout.html) ─────── */
  function renderCheckoutPage(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    function draw() {
      const items = (typeof DDCart !== 'undefined') ? DDCart.getItems() : [];

      if (!items.length) {
        el.innerHTML = `
          <div class="dd-cart-empty dd-checkout-empty">
            <h1>Checkout</h1>
            <p>Your basket is empty, so there's nothing to check out yet. Browse the Artisan Shop to find a handmade piece you love, then come back to complete your order.</p>
            <div class="btn-group btn-group-center">
              <a href="shop/index.html" class="btn btn-gold btn-lg">Browse the Shop</a>
              <a href="cart.html" class="btn btn-outline-gold btn-lg">View Basket</a>
            </div>
          </div>`;
        return;
      }

      const subtotal = (typeof DDCart !== 'undefined') ? DDCart.getSubtotal() : { amount: 0, hasPriceOnRequest: true, allUnknown: true };
      const saved = getDetails();
      const country = saved.country && saved.country.trim() ? saved.country : DEFAULT_COUNTRY;

      const summaryRows = items.map(item => `
        <div class="dd-checkout-summary-row">
          <span class="dd-checkout-summary-name">${item.title} <em>x${item.qty}</em></span>
          <span class="dd-checkout-summary-price">${typeof item.price === 'number' ? formatPrice(item.price * item.qty) : 'Price on request'}</span>
        </div>`).join('');

      const subtotalLine = subtotal.allUnknown
        ? `Price on request`
        : `${formatPrice(subtotal.amount)}${subtotal.hasPriceOnRequest ? ' + items on request' : ''}`;

      const priceNoticeBlock = subtotal.hasPriceOnRequest ? `
        <p class="dd-checkout-price-notice">
          Online payment is available only after price confirmation. Please WhatsApp Durga Designs for final availability and price.
        </p>` : '';

      const fieldsMarkup = FIELD_DEFS.map(def => {
        const value = (def.key === 'country') ? country : (saved[def.key] || '');
        return fieldMarkup(def, value);
      }).join('');

      // Stripe-hosted Checkout (TEST MODE) is only offered when every basket
      // item carries a confirmed numeric price. We never invent a price, so
      // any "Price on request" item blocks Stripe checkout outright and the
      // customer is pointed to WhatsApp instead — this mirrors the
      // authoritative server-side check in the Netlify function.
      const stripeEligible = (typeof DDPayment !== 'undefined')
        ? DDPayment.canUseStripeCheckout(items)
        : { eligible: false, reason: 'Online payment is not available right now.' };

      const stripeBlock = stripeEligible.eligible ? `
        <button type="button" class="btn btn-gold btn-lg btn-full dd-checkout-stripe-btn" data-stripe-checkout>
          🔒 Pay Securely with Stripe (Test Mode)
        </button>
        <p class="dd-checkout-stripe-error" data-stripe-error aria-live="polite"></p>
      ` : `
        <p class="dd-checkout-stripe-blocked-note">${stripeEligible.reason}</p>
        <button type="button" class="btn btn-gold btn-lg btn-full dd-checkout-stripe-btn" disabled aria-disabled="true" title="Online payment is not available for this basket">
          🔒 Pay Securely with Stripe — unavailable
        </button>
      `;

      el.innerHTML = `
        <div class="dd-checkout-layout">

          <div class="dd-checkout-summary-col">
            <h1>Checkout</h1>
            <div class="dd-checkout-summary-box">
              <h2>Order Summary</h2>
              <div class="dd-checkout-summary-rows">${summaryRows}</div>
              <div class="dd-checkout-summary-row dd-checkout-summary-total">
                <span>Estimated total</span>
                <span>${subtotalLine}</span>
              </div>
              <p class="dd-checkout-delivery-note">Delivery cost will be calculated and confirmed with you directly.</p>
              ${priceNoticeBlock}
            </div>
          </div>

          <div class="dd-checkout-form-col">
            <form id="dd-checkout-form" novalidate>
              <h2>Delivery &amp; Contact Details</h2>
              <p class="dd-checkout-form-intro">Tell us where to send your order. We'll confirm final pricing, availability and delivery with you before anything is charged.</p>

              <div class="dd-checkout-fields">
                ${fieldsMarkup}
              </div>

              <p class="dd-checkout-form-status" data-form-status aria-live="polite"></p>

              ${stripeBlock}

              <button type="submit" class="btn btn-outline-gold btn-lg btn-full" data-save-details>
                Save My Details
              </button>
              <p class="dd-checkout-trust-text">
                🔒 Secure card payment is processed by Stripe. Durga Designs never stores your card details.
              </p>

              <a href="#" data-wa-checkout class="btn btn-whatsapp btn-lg btn-full" target="_blank" rel="noopener">
                Confirm Order via WhatsApp
              </a>
              <p class="dd-checkout-wa-note">Prefer to confirm now? Send us your details and basket on WhatsApp and we'll get back to you with final pricing, availability and delivery.</p>
            </form>
          </div>

        </div>`;

      wireFormEvents(items);
    }

    function readFormValues(form) {
      const values = {};
      FIELD_DEFS.forEach(def => {
        const fieldEl = form.querySelector(`[name="${def.key}"]`);
        values[def.key] = fieldEl ? fieldEl.value.trim() : '';
      });
      return values;
    }

    function clearFieldError(form, key) {
      const wrap = form.querySelector(`[data-field="${key}"]`);
      if (!wrap) return;
      wrap.classList.remove('dd-field-invalid');
      const errEl = wrap.querySelector('[data-field-error]');
      if (errEl) errEl.textContent = '';
    }

    function setFieldError(form, key, message) {
      const wrap = form.querySelector(`[data-field="${key}"]`);
      if (!wrap) return;
      wrap.classList.add('dd-field-invalid');
      const errEl = wrap.querySelector('[data-field-error]');
      if (errEl) errEl.textContent = message;
    }

    function validate(form, values) {
      let firstInvalid = null;
      let valid = true;

      FIELD_DEFS.forEach(def => clearFieldError(form, def.key));

      FIELD_DEFS.forEach(def => {
        const value = values[def.key] || '';

        if (def.required && !value) {
          setFieldError(form, def.key, `${def.label.replace(' (optional)', '')} is required.`);
          valid = false;
          if (!firstInvalid) firstInvalid = def.key;
          return;
        }

        if (def.key === 'email' && value && !isValidEmail(value)) {
          setFieldError(form, def.key, 'Please enter a valid email address (e.g. name@example.com).');
          valid = false;
          if (!firstInvalid) firstInvalid = def.key;
          return;
        }

        if (def.key === 'postcode' && value) {
          const looksUk = (values.country || '').trim().toLowerCase() === DEFAULT_COUNTRY.toLowerCase()
                       || (values.country || '').trim().toLowerCase() === 'uk'
                       || (values.country || '').trim().toLowerCase() === 'united kingdom';
          if (looksUk && !isLikelyUkPostcode(value)) {
            setFieldError(form, def.key, 'That postcode looks incomplete — please double-check it (UK postcodes are usually like "B11 4AP").');
            valid = false;
            if (!firstInvalid) firstInvalid = def.key;
          }
        }
      });

      return { valid, firstInvalid };
    }

    function wireFormEvents(items) {
      const form = el.querySelector('#dd-checkout-form');
      const statusEl = el.querySelector('[data-form-status]');
      const waLink = el.querySelector('[data-wa-checkout]');

      if (!form) return;

      function syncWaLink() {
        const values = readFormValues(form);
        if (waLink) waLink.href = buildWaCheckoutUrl(values, items);
      }

      // Live-save as the customer types, and refresh the WhatsApp link.
      FIELD_DEFS.forEach(def => {
        const fieldEl = form.querySelector(`[name="${def.key}"]`);
        if (!fieldEl) return;
        fieldEl.addEventListener('input', () => {
          clearFieldError(form, def.key);
          if (statusEl) statusEl.textContent = '';
          const values = readFormValues(form);
          saveDetails(values);
          syncWaLink();
        });
        fieldEl.addEventListener('blur', () => {
          const values = readFormValues(form);
          validateSingle(form, def.key, values);
        });
      });

      function validateSingle(form, key, values) {
        // Re-run full validation but only surface the message for this field —
        // keeps logic in one place while giving immediate per-field feedback.
        const def = FIELD_DEFS.find(d => d.key === key);
        if (!def) return;
        const value = values[key] || '';
        clearFieldError(form, key);

        if (def.required && !value) {
          setFieldError(form, key, `${def.label.replace(' (optional)', '')} is required.`);
          return;
        }
        if (key === 'email' && value && !isValidEmail(value)) {
          setFieldError(form, key, 'Please enter a valid email address (e.g. name@example.com).');
          return;
        }
        if (key === 'postcode' && value) {
          const looksUk = (values.country || '').trim().toLowerCase() === DEFAULT_COUNTRY.toLowerCase()
                       || (values.country || '').trim().toLowerCase() === 'uk'
                       || (values.country || '').trim().toLowerCase() === 'united kingdom';
          if (looksUk && !isLikelyUkPostcode(value)) {
            setFieldError(form, key, 'That postcode looks incomplete — please double-check it (UK postcodes are usually like "B11 4AP").');
          }
        }
      }

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const values = readFormValues(form);
        saveDetails(values);
        const result = validate(form, values);

        if (!result.valid) {
          if (statusEl) {
            statusEl.textContent = 'Please check the highlighted fields above before continuing.';
            statusEl.classList.add('dd-checkout-status-error');
          }
          if (result.firstInvalid) {
            const target = form.querySelector(`[name="${result.firstInvalid}"]`);
            if (target) target.focus();
          }
          return;
        }

        if (statusEl) {
          statusEl.classList.remove('dd-checkout-status-error');
          statusEl.textContent = 'Your details are saved. You can now pay securely with Stripe (test mode) if your basket is eligible, or confirm your order with us on WhatsApp.';
        }
        syncWaLink();
      });

      // ── Stripe-hosted Checkout (TEST MODE) ───────────────────────
      // Clicking this button NEVER collects card details on this page.
      // It validates the form, saves details locally, then asks our own
      // serverless function to create a Stripe Checkout Session and
      // redirects the browser to Stripe's hosted payment page.
      const stripeBtn = el.querySelector('[data-stripe-checkout]');
      const stripeErrorEl = el.querySelector('[data-stripe-error]');

      if (stripeBtn) {
        stripeBtn.addEventListener('click', async () => {
          if (stripeErrorEl) stripeErrorEl.textContent = '';

          const values = readFormValues(form);
          saveDetails(values);
          const result = validate(form, values);

          if (!result.valid) {
            if (statusEl) {
              statusEl.textContent = 'Please check the highlighted fields above before continuing to secure payment.';
              statusEl.classList.add('dd-checkout-status-error');
            }
            if (result.firstInvalid) {
              const target = form.querySelector(`[name="${result.firstInvalid}"]`);
              if (target) target.focus();
            }
            return;
          }

          if (typeof DDPayment === 'undefined') {
            if (stripeErrorEl) stripeErrorEl.textContent = 'Online payment is not available right now. Please use the WhatsApp option below.';
            return;
          }

          const originalLabel = stripeBtn.textContent;
          stripeBtn.disabled = true;
          stripeBtn.classList.add('dd-checkout-stripe-loading');
          stripeBtn.textContent = 'Redirecting to secure payment…';

          const outcome = await DDPayment.startStripeCheckout(items, values);

          if (!outcome.ok) {
            stripeBtn.disabled = false;
            stripeBtn.classList.remove('dd-checkout-stripe-loading');
            stripeBtn.textContent = originalLabel;
            if (stripeErrorEl) stripeErrorEl.textContent = outcome.error || 'We could not start secure payment just now. Please try again, or message us on WhatsApp.';
          }
          // On success, DDPayment redirects the browser to Stripe — nothing else to do here.
        });
      }

      // Pre-fill the WhatsApp link from any saved details immediately.
      syncWaLink();
    }

    draw();

    // keep this page in sync if the basket changes in another tab
    window.addEventListener('storage', (e) => {
      if (e.key === 'dd_cart_v1') draw();
    });
  }

  return {
    getDetails, saveDetails, clearDetails, renderCheckoutPage
  };

})();
