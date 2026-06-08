/* ================================================================
   DURGA DESIGNS — ORDER HELPER UTILITIES (Stage 5, DEV/TEST ONLY)
   ================================================================
   Small, dependency-free helpers shared by the Stripe webhook and
   the dev order store. Pure functions only — no I/O here.
   ================================================================ */

'use strict';

// Builds a human-friendly order number from a Stripe Checkout Session ID.
// Not a database auto-increment — just a stable, readable reference for
// this dev/test stage. Real numbering can be revisited with Supabase (Stage 6).
function buildOrderNumber(sessionId, createdAtISO) {
  const datePart = (createdAtISO || new Date().toISOString()).slice(0, 10).replace(/-/g, '');
  const shortSession = (sessionId || '').replace(/^cs_(test|live)_/, '').slice(-8).toUpperCase();
  return `DD-TEST-${datePart}-${shortSession || 'UNKNOWN'}`;
}

// Converts Stripe's minor-unit integer (pence) to a GBP decimal amount.
function minorUnitsToAmount(minorUnits) {
  if (typeof minorUnits !== 'number' || Number.isNaN(minorUnits)) return null;
  return Math.round(minorUnits) / 100;
}

// Strips anything that even resembles card data from an object before it's
// ever written to the dev order store or logs. Defence in depth — Stripe
// Checkout never sends us raw card details, but we guard anyway.
const FORBIDDEN_KEY_PATTERN = /card|cvc|cvv|pan|expiry|expiration/i;

function stripForbiddenFields(value) {
  if (Array.isArray(value)) {
    return value.map(stripForbiddenFields);
  }
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).forEach((key) => {
      if (FORBIDDEN_KEY_PATTERN.test(key)) return; // drop entirely
      out[key] = stripForbiddenFields(value[key]);
    });
    return out;
  }
  return value;
}

// Safe, minimal projection of customer/delivery details — only what's
// needed to fulfil an order. Never includes payment instrument data
// (Stripe Checkout handles and stores that; we never receive it).
function sanitiseCustomerDetails(raw) {
  const safe = (raw && typeof raw === 'object') ? raw : {};
  return stripForbiddenFields({
    fullName: typeof safe.fullName === 'string' ? safe.fullName.slice(0, 200) : '',
    email:    typeof safe.email === 'string' ? safe.email.slice(0, 200) : '',
    phone:    typeof safe.phone === 'string' ? safe.phone.slice(0, 60) : '',
    address1: typeof safe.address1 === 'string' ? safe.address1.slice(0, 200) : '',
    address2: typeof safe.address2 === 'string' ? safe.address2.slice(0, 200) : '',
    city:     typeof safe.city === 'string' ? safe.city.slice(0, 120) : '',
    postcode: typeof safe.postcode === 'string' ? safe.postcode.slice(0, 20) : '',
    country:  typeof safe.country === 'string' ? safe.country.slice(0, 80) : '',
    notes:    typeof safe.notes === 'string' ? safe.notes.slice(0, 500) : ''
  });
}

module.exports = {
  buildOrderNumber,
  minorUnitsToAmount,
  stripForbiddenFields,
  sanitiseCustomerDetails
};
