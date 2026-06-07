/* ================================================================
   DURGA DESIGNS — CREATE STRIPE CHECKOUT SESSION (Stage 4)
   ================================================================
   Netlify serverless function (NOT deployed yet — local/test only).

   Purpose: create a Stripe-hosted Checkout Session in TEST MODE for
   baskets that contain ONLY products with confirmed numeric prices.

   Hard rules enforced here:
     - Stripe-hosted Checkout ONLY — we never collect card details ourselves
     - TEST MODE keys only (this stage). Server refuses to run with a
       key that doesn't look like a Stripe test secret key.
     - Prices and product identity are NEVER trusted from the frontend.
       Every line item is re-priced from SAFE_PRODUCT_MAP below.
     - "Price on request" (price === null) products are rejected outright.
     - Unknown product slugs are rejected outright.
     - Currency is GBP only.
     - This function does NOT create an order record, does NOT save
       customer data, does NOT touch a database, and does NOT send email.
       Those all arrive in later stages.

   Request body (POST, JSON):
     {
       items: [ { slug: string, qty: number }, ... ],
       customer: { fullName, email, phone } // optional, for Checkout prefill only
     }

   Response (200):
     { url: "<stripe checkout session url>" }

   Response (4xx/5xx):
     { error: "<safe, customer-facing message>" }
   ================================================================ */

'use strict';

/* ── Server-side SAFE product/price map ──────────────────────────
   This is the ONLY source of truth for prices used in payment.
   Mirrors js/shop-catalogue.js slugs. Every current catalogue item
   is still "Price on request" (price: null) — per project rules we
   never invent a price, so these remain ineligible for Stripe
   checkout until a real numeric GBP price is confirmed and added
   here intentionally by a developer/admin.
   ---------------------------------------------------------------- */
const SAFE_PRODUCT_MAP = {
  'sindhi-embroidered-tote-mirror-work':        { title: 'Sindhi Embroidered Tote Bag — Mirror Work',              price: null },
  'sindhi-embroidered-clutch-floral':           { title: 'Sindhi Embroidered Clutch — Floral Motif',               price: null },
  'sindhi-embroidered-kurta-indigo':            { title: 'Sindhi Embroidered Cotton Kurta — Indigo',               price: null },
  'sindhi-embroidered-kurta-ivory-gold':        { title: 'Sindhi Embroidered Kurta — Ivory & Gold Thread',         price: null },
  'sindhi-wall-hanging-mirror-tassel':          { title: 'Sindhi Embroidered Wall Hanging — Mirror & Tassel',      price: null },
  'round-sindhi-wall-hanging-mandala':          { title: 'Round Sindhi Wall Hanging — Mandala Embroidery',         price: null },
  'embroidered-cushion-cover-sindhi-pattern':   { title: 'Embroidered Cushion Cover — Sindhi Pattern',             price: null },
  'handmade-table-runner-mirror-trim':          { title: 'Handmade Table Runner — Mirror Work Trim',               price: null },

  // Example shape for when a real price is confirmed (kept commented out
  // so nothing is accidentally treated as purchasable with a fake price):
  // 'example-slug': { title: 'Example Product', price: 24.50 }, // GBP, numeric, confirmed
};

const CURRENCY = 'gbp';
const PRICE_ON_REQUEST_MESSAGE =
  'Online payment is available only after price confirmation. Please WhatsApp Durga Designs for final availability and price.';

/* ── helpers ─────────────────────────────────────────────────── */

function jsonResponse(statusCode, bodyObj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyObj)
  };
}

// Loosely validate that a key "looks like" a Stripe TEST secret key.
// We refuse to run with anything that looks like a live key, and fail
// safely (clear message, no crash) if no key is configured at all.
function getSafeStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return { ok: false, reason: 'missing' };
  }
  if (key.startsWith('sk_live_')) {
    return { ok: false, reason: 'live-key-blocked' };
  }
  if (!key.startsWith('sk_test_')) {
    return { ok: false, reason: 'unrecognised-format' };
  }
  return { ok: true, key };
}

function getSiteUrl() {
  return (process.env.SITE_URL || 'http://localhost:8888').replace(/\/+$/, '');
}

/* ── main handler ────────────────────────────────────────────── */

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  // 1. Fail safely if Stripe isn't configured for local/test use.
  const keyCheck = getSafeStripeSecretKey();
  if (!keyCheck.ok) {
    let devMessage = 'Stripe is not configured for this environment.';
    if (keyCheck.reason === 'missing') {
      devMessage = 'STRIPE_SECRET_KEY is not set. Add a Stripe TEST secret key (sk_test_...) to your local environment (see .env.example) to enable test checkout.';
    } else if (keyCheck.reason === 'live-key-blocked') {
      devMessage = 'A live Stripe secret key (sk_live_...) was detected and has been blocked. This project only supports Stripe TEST MODE at this stage.';
    } else if (keyCheck.reason === 'unrecognised-format') {
      devMessage = 'STRIPE_SECRET_KEY does not look like a Stripe test secret key (expected it to start with "sk_test_").';
    }
    // eslint-disable-next-line no-console
    console.error('[create-checkout-session] Stripe not available:', devMessage);
    return jsonResponse(503, {
      error: 'Online test payment is not available right now. Please WhatsApp Durga Designs to complete your order, or try again later.',
      developerMessage: devMessage
    });
  }

  // 2. Parse and sanity-check the request body.
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return jsonResponse(400, { error: 'Could not read your basket. Please refresh the page and try again.' });
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) {
    return jsonResponse(400, { error: 'Your basket is empty.' });
  }

  // 3. Validate every item against the SAFE server-side product/price map.
  //    Frontend slugs/quantities are accepted; frontend PRICES are ignored
  //    entirely — every amount is recalculated here.
  const lineItems = [];
  for (const rawItem of items) {
    const slug = rawItem && typeof rawItem.slug === 'string' ? rawItem.slug.trim() : '';
    const qty = Math.max(1, Math.min(99, parseInt(rawItem && rawItem.qty, 10) || 1));

    const safeProduct = SAFE_PRODUCT_MAP[slug];

    if (!safeProduct) {
      return jsonResponse(400, {
        error: 'One or more items in your basket could not be verified. Please refresh your basket and try again, or message us on WhatsApp.',
        developerMessage: `Unknown product slug rejected: "${slug}"`
      });
    }

    if (typeof safeProduct.price !== 'number') {
      return jsonResponse(409, {
        error: PRICE_ON_REQUEST_MESSAGE,
        developerMessage: `Price-on-request product rejected from Stripe checkout: "${slug}"`
      });
    }

    // Stripe expects integer minor units (pence) for GBP.
    const unitAmount = Math.round(safeProduct.price * 100);

    lineItems.push({
      quantity: qty,
      price_data: {
        currency: CURRENCY,
        unit_amount: unitAmount,
        product_data: {
          name: safeProduct.title
        }
      }
    });
  }

  // 4. Create the Stripe Checkout Session (test mode key only).
  //    `stripe` is loaded lazily so this file can be reviewed/required
  //    without the dependency being installed yet.
  let stripe;
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    stripe = require('stripe')(keyCheck.key);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[create-checkout-session] Stripe SDK not installed:', e.message);
    return jsonResponse(503, {
      error: 'Online test payment is not available right now. Please WhatsApp Durga Designs to complete your order, or try again later.',
      developerMessage: 'The "stripe" npm package is not installed. Run `npm install stripe` in netlify/functions (or project root, depending on your bundler) before testing this function.'
    });
  }

  const siteUrl = getSiteUrl();
  const customer = (payload.customer && typeof payload.customer === 'object') ? payload.customer : {};
  const customerEmail = (typeof customer.email === 'string' && customer.email.trim()) ? customer.email.trim() : undefined;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      currency: CURRENCY,
      line_items: lineItems,
      customer_email: customerEmail,
      success_url: `${siteUrl}/order-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/order-cancelled.html`,
      // NOTE: No order is created and no customer data is persisted here.
      // That arrives in a later stage, alongside webhook verification.
    });

    return jsonResponse(200, { url: session.url });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[create-checkout-session] Stripe session creation failed:', err && err.message);
    return jsonResponse(502, {
      error: 'We could not start secure payment just now. Please try again, or message us on WhatsApp to complete your order.',
      developerMessage: (err && err.message) || 'Unknown Stripe error'
    });
  }
};
