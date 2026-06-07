/* ================================================================
   DURGA DESIGNS — STRIPE TEST CHECKOUT (FRONTEND) — Stage 4
   ================================================================
   This module ONLY ever talks to our own Netlify Function
   ("/.netlify/functions/create-checkout-session") and then redirects
   the customer to a Stripe-HOSTED Checkout page.

   It NEVER:
     - collects card numbers, CVC, or any raw card details
     - stores or transmits a Stripe secret key (there isn't one here —
       STRIPE_SECRET_KEY lives only in the serverless function's
       environment variables, never in frontend code)
     - invents or overrides prices — the server re-validates everything

   Public API (window.DDPayment):
     canUseStripeCheckout(items)  → { eligible, reason }
     startStripeCheckout(items, customer) → redirects on success,
                                             returns a friendly error otherwise
   ================================================================ */

const DDPayment = (() => {

  const FUNCTION_ENDPOINT = '/.netlify/functions/create-checkout-session';

  const PRICE_ON_REQUEST_MESSAGE =
    'Online payment is available only after price confirmation. Please WhatsApp Durga Designs for final availability and price.';

  // Frontend-side eligibility pre-check. This is purely for UX (so we can
  // disable the button and explain why) — the serverless function performs
  // the REAL, authoritative validation server-side and must never be bypassed.
  function canUseStripeCheckout(items) {
    if (!Array.isArray(items) || !items.length) {
      return { eligible: false, reason: 'Your basket is empty.' };
    }
    const hasPriceOnRequest = items.some(i => typeof i.price !== 'number');
    if (hasPriceOnRequest) {
      return { eligible: false, reason: PRICE_ON_REQUEST_MESSAGE };
    }
    return { eligible: true, reason: '' };
  }

  // Calls our serverless function, then redirects the browser to the
  // Stripe-hosted Checkout URL it returns. Resolves with { ok, error }.
  async function startStripeCheckout(items, customer) {
    const eligibility = canUseStripeCheckout(items);
    if (!eligibility.eligible) {
      return { ok: false, error: eligibility.reason };
    }

    const slimItems = items.map(i => ({ slug: i.slug, qty: i.qty || 1 }));
    const slimCustomer = customer ? {
      fullName: customer.fullName || '',
      email:    customer.email    || '',
      phone:    customer.phone    || ''
    } : {};

    let response;
    try {
      response = await fetch(FUNCTION_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: slimItems, customer: slimCustomer })
      });
    } catch (networkErr) {
      return {
        ok: false,
        error: 'We could not reach secure payment just now (this feature requires the local Netlify Functions server to be running). Please try again, or message us on WhatsApp to complete your order.'
      };
    }

    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      data = {};
    }

    if (!response.ok || !data || !data.url) {
      return {
        ok: false,
        error: (data && data.error) || 'We could not start secure payment just now. Please try again, or message us on WhatsApp to complete your order.'
      };
    }

    // Redirect to Stripe-hosted Checkout (test mode). No card details are
    // ever entered on a Durga Designs page.
    window.location.href = data.url;
    return { ok: true, error: '' };
  }

  return { canUseStripeCheckout, startStripeCheckout };

})();
