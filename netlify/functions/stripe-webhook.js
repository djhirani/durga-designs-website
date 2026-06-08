/* ================================================================
   DURGA DESIGNS — STRIPE WEBHOOK HANDLER (Stage 5 + Stage 6)
   ================================================================
   Netlify serverless function (NOT deployed yet — local/test only).

   Purpose: securely receive Stripe webhook events, verify their
   signature, and — ONLY for a confirmed `checkout.session.completed`
   event — persist a paid order via netlify/functions/lib/order-store.js.

   As of Stage 6, order-store.js is a ROUTER:
     - If Supabase is configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY),
       orders are written to Postgres via supabase-order-store.js — the
       intended PRODUCTION path (see supabase/migrations/001_create_orders.sql).
     - Otherwise it falls back to the original DEV/TEST-ONLY local file
       store from Stage 5, purely so this can still be exercised locally
       without a Supabase project. That fallback is clearly labelled and
       must never be relied on for real customer orders.
   This handler does not need to know or care which one is active —
   that seam was deliberately left in order-store.js's calling convention.
   Admin tooling and emails come in later stages (7 and 8).

   Hard rules enforced here:
     - The raw request body is verified against STRIPE_WEBHOOK_SECRET
       using Stripe's official signature verification. Unsigned or
       incorrectly-signed requests are REJECTED before any processing.
     - Only `checkout.session.completed` is acted on. Every other event
       type is acknowledged (200) but otherwise ignored — this is the
       behaviour Stripe expects from a well-behaved webhook endpoint.
     - The Stripe Checkout Session ID is the idempotency key. If an
       order for that session already exists, we do nothing further —
       Stripe's "at least once" delivery guarantee can never produce
       a duplicate order here.
     - Card numbers, CVC, and other raw payment-instrument data are
       NEVER present in a Checkout Session object and are NEVER stored.
     - STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET never leave this
       server-side function.
     - If required environment variables are missing, the function
       fails safely (clear log message, 503 response) instead of
       crashing or silently accepting unverified events.
   ================================================================ */

'use strict';

const { saveOrder, hasOrder } = require('./lib/order-store');
const { buildOrderNumber, minorUnitsToAmount, sanitiseCustomerDetails } = require('./lib/order-utils');
const { sendCustomerConfirmation, sendAdminNewOrder } = require('./lib/email-service');

function jsonResponse(statusCode, bodyObj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyObj)
  };
}

// Loosely validate "looks like a Stripe TEST secret key" — mirrors the
// check in create-checkout-session.js so both functions agree on what
// "safe to run" means at this stage of the project.
function getSafeStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, reason: 'missing-secret-key' };
  if (key.startsWith('sk_live_')) return { ok: false, reason: 'live-key-blocked' };
  if (!key.startsWith('sk_test_')) return { ok: false, reason: 'unrecognised-secret-key-format' };
  return { ok: true, key };
}

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return { ok: false, reason: 'missing-webhook-secret' };
  if (!secret.startsWith('whsec_')) return { ok: false, reason: 'unrecognised-webhook-secret-format' };
  return { ok: true, secret };
}

/* ── main handler ────────────────────────────────────────────── */

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  // 1. Fail safely if Stripe isn't configured for local/test use.
  const keyCheck = getSafeStripeSecretKey();
  const whCheck = getWebhookSecret();

  if (!keyCheck.ok || !whCheck.ok) {
    const reasons = [];
    if (!keyCheck.ok) reasons.push(keyCheck.reason);
    if (!whCheck.ok) reasons.push(whCheck.reason);
    // eslint-disable-next-line no-console
    console.error('[stripe-webhook] Refusing to process — Stripe not safely configured:', reasons.join(', '));
    return jsonResponse(503, {
      error: 'Webhook endpoint is not configured for this environment.',
      developerMessage:
        'Set STRIPE_SECRET_KEY (sk_test_...) and STRIPE_WEBHOOK_SECRET (whsec_...) in your local environment (see .env.example). ' +
        'Live keys (sk_live_...) are blocked at this stage — test mode only.'
    });
  }

  // 2. Verify the webhook signature BEFORE doing anything else.
  //    Netlify provides the raw body via event.body; the signature lives
  //    in the "stripe-signature" header. We must use the *raw* string —
  //    re-serialised JSON will not match the signature.
  let stripe;
  try {
    // eslint-disable-next-line global-require
    stripe = require('stripe')(keyCheck.key);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[stripe-webhook] Stripe SDK not installed:', e.message);
    return jsonResponse(503, {
      error: 'Webhook endpoint is not available right now.',
      developerMessage: 'The "stripe" npm package is not installed. Run `npm install stripe` before testing this function.'
    });
  }

  const signature = event.headers && (event.headers['stripe-signature'] || event.headers['Stripe-Signature']);
  if (!signature) {
    // eslint-disable-next-line no-console
    console.warn('[stripe-webhook] Rejected request with no Stripe-Signature header.');
    return jsonResponse(400, { error: 'Missing Stripe signature.' });
  }

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, signature, whCheck.secret);
  } catch (err) {
    // Signature verification failed — this request did NOT genuinely come
    // from Stripe (or the payload was altered in transit). Reject it.
    // eslint-disable-next-line no-console
    console.warn('[stripe-webhook] Signature verification failed — request rejected:', err && err.message);
    return jsonResponse(400, { error: 'Invalid webhook signature.' });
  }

  // 3. Only act on checkout.session.completed. Acknowledge everything
  //    else so Stripe doesn't retry events we deliberately ignore.
  if (stripeEvent.type !== 'checkout.session.completed') {
    return jsonResponse(200, { received: true, ignored: stripeEvent.type });
  }

  const session = stripeEvent.data && stripeEvent.data.object;
  if (!session || !session.id) {
    // eslint-disable-next-line no-console
    console.error('[stripe-webhook] checkout.session.completed event missing session object/id.');
    return jsonResponse(400, { error: 'Malformed event payload.' });
  }

  // 4. Idempotency check — Stripe may retry delivery of the same event.
  //    The Checkout Session ID is our idempotency key; if we already have
  //    an order for it, we acknowledge success without doing anything else.
  if (await hasOrder(session.id)) {
    return jsonResponse(200, { received: true, duplicate: true, sessionId: session.id });
  }

  // 5. Only proceed for sessions Stripe says were actually paid.
  //    (Checkout can complete a session for "no payment required" cases
  //    too — we only want confirmed, paid orders at this stage.)
  if (session.payment_status !== 'paid') {
    return jsonResponse(200, { received: true, skipped: 'not-paid', paymentStatus: session.payment_status });
  }

  // 6. Build the DEV/TEST-ONLY order record.
  //    - We trust ONLY data Stripe has confirmed (the session object),
  //      never raw frontend input.
  //    - Customer/delivery details come from `session.metadata`, which
  //      create-checkout-session.js populates with a minimal, sanitised
  //      snapshot of the checkout form at the time the session was created.
  //    - No card data is present anywhere in a Checkout Session object;
  //      sanitiseCustomerDetails() also strips anything that looks like it.
  const metadata = (session.metadata && typeof session.metadata === 'object') ? session.metadata : {};

  let basketItems = [];
  try {
    if (metadata.basketItemsJson) basketItems = JSON.parse(metadata.basketItemsJson);
  } catch (e) {
    basketItems = [];
  }

  const customerDetails = sanitiseCustomerDetails({
    fullName: metadata.customerFullName,
    email:    metadata.customerEmail || (session.customer_details && session.customer_details.email),
    phone:    metadata.customerPhone,
    address1: metadata.customerAddress1,
    address2: metadata.customerAddress2,
    city:     metadata.customerCity,
    postcode: metadata.customerPostcode,
    country:  metadata.customerCountry,
    notes:    metadata.customerNotes
  });

  const createdAtISO = new Date().toISOString();
  const totalAmount = minorUnitsToAmount(session.amount_total);

  const order = {
    schemaLabel: 'DEV_TEST_ORDER_v1', // ⚠️ marks this as dev/test data — never a production schema
    orderNumber: buildOrderNumber(session.id, createdAtISO),

    stripeSessionId: session.id,
    stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent && session.payment_intent.id) || null,
    stripeEventId: stripeEvent.id, // raw event ID — kept for audit/idempotency cross-checks

    customer: customerDetails,

    basketItems: Array.isArray(basketItems) ? basketItems.slice(0, 100) : [],

    totalAmount,
    currency: (session.currency || 'gbp').toLowerCase(),

    paymentStatus: session.payment_status,  // expected: "paid"
    orderStatus: 'Paid',                    // dev/test label only — no fulfilment workflow yet

    createdAt: createdAtISO
  };

  const result = await saveOrder(order);

  if (result.error) {
    // eslint-disable-next-line no-console
    console.error('[stripe-webhook] Failed to persist DEV/TEST order:', result.error);
    // We still acknowledge the webhook (200) — Stripe payment already
    // succeeded; a storage hiccup in our throwaway dev store should not
    // cause Stripe to endlessly retry. This will be revisited with a
    // proper datastore (Supabase) in Stage 6.
    return jsonResponse(200, { received: true, stored: false, sessionId: session.id });
  }

  // 7. Send the customer confirmation + admin notification emails —
  //    but ONLY the very first time this order is genuinely created.
  //    `result.created === true` is the structural duplicate-prevention
  //    guard: a Stripe retry would have been caught by hasOrder() above
  //    (returns early) or by `alreadyExisted` here (race condition).
  //    email-service.js layers a second, persisted check
  //    (confirmation_email_sent_at / admin_email_sent_at) on top of
  //    this for defence in depth — see lib/email-service.js.
  //
  //    Email failures must NEVER break order creation or this response:
  //    Stripe has already been told payment succeeded, and the order is
  //    already safely stored — a missing/broken email service is a
  //    notification problem, not an order problem (Stage 9+ concern).
  if (result.created) {
    // Build the normalised "order" shape email-service/templates expect —
    // reuses the same field names the admin dashboard already normalises
    // to, so templates work identically regardless of which backend
    // ultimately stored the order.
    const emailOrder = {
      id: order.stripeSessionId,
      stripeSessionId: order.stripeSessionId,
      orderNumber: order.orderNumber,
      customerName: order.customer && order.customer.fullName,
      customerEmail: order.customer && order.customer.email,
      customerPhone: order.customer && order.customer.phone,
      address: {
        line1: order.customer && order.customer.address1,
        line2: order.customer && order.customer.address2,
        city: order.customer && order.customer.city,
        postcode: order.customer && order.customer.postcode,
        country: order.customer && order.customer.country
      },
      items: order.basketItems,
      totalAmount: order.totalAmount,
      currency: order.currency
    };

    try {
      const confirmationResult = await sendCustomerConfirmation(emailOrder);
      if (!confirmationResult.ok) {
        // eslint-disable-next-line no-console
        console.error('[stripe-webhook] Customer confirmation email failed:', confirmationResult.error);
      } else if (confirmationResult.skipped) {
        // eslint-disable-next-line no-console
        console.log('[stripe-webhook] Customer confirmation email skipped:', confirmationResult.reason);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[stripe-webhook] Unexpected error sending customer confirmation email:', e && e.message);
    }

    try {
      const adminResult = await sendAdminNewOrder(emailOrder);
      if (!adminResult.ok) {
        // eslint-disable-next-line no-console
        console.error('[stripe-webhook] Admin new-order email failed:', adminResult.error);
      } else if (adminResult.skipped) {
        // eslint-disable-next-line no-console
        console.log('[stripe-webhook] Admin new-order email skipped:', adminResult.reason);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[stripe-webhook] Unexpected error sending admin new-order email:', e && e.message);
    }
  }

  return jsonResponse(200, {
    received: true,
    stored: result.created,
    duplicate: result.alreadyExisted,
    sessionId: session.id,
    orderNumber: order.orderNumber
  });
};
