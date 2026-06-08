/* ================================================================
   DURGA DESIGNS — SUPABASE CLIENT (server-side only) — Stage 6
   ================================================================
   This module is for SERVERLESS FUNCTIONS ONLY (netlify/functions/**).
   It must NEVER be imported from, or its output exposed to, any
   frontend-servable file (HTML, browser JS, css, etc.).

   Why:
     - SUPABASE_SERVICE_ROLE_KEY bypasses Row Level Security entirely.
       Anyone holding it has full read/write access to every table —
       it is exactly as sensitive as a database root password.
     - The frontend must never talk to Supabase directly for orders.
       All order writes happen exclusively inside the Stripe webhook
       handler, server-side, after Stripe has confirmed payment.

   Behaviour:
     - getSupabaseClient() returns { ok:false, reason } if SUPABASE_URL
       or SUPABASE_SERVICE_ROLE_KEY are missing/malformed — it never
       throws, so callers can fail safely and fall back to the dev
       file-based order store (Stage 5) when Supabase isn't configured
       for local development.
     - The `@supabase/supabase-js` package is loaded lazily so this
       file can be reviewed/required even before the dependency is
       installed (mirrors the lazy `require('stripe')` pattern already
       used in create-checkout-session.js / stripe-webhook.js).
   ================================================================ */

'use strict';

let cachedClient = null;
let cachedClientKey = null;

// Loosely validate the configured Supabase URL — must be an https URL
// on the *.supabase.co domain. We don't try to be exhaustive; this is
// a "does it look sane / not obviously wrong" guard, not a security
// boundary (RLS + the service-role-only access pattern is the real one).
function looksLikeSupabaseUrl(url) {
  return typeof url === 'string' && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url.trim());
}

// Service role keys are long Supabase JWTs (they start with "eyJ..." —
// base64url JSON header). We don't decode/verify them here (that's
// Supabase's job at request time); we just refuse anything that's
// obviously a placeholder or the wrong shape entirely.
function looksLikeServiceRoleKey(key) {
  if (typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (!trimmed || /REPLACE_ME/i.test(trimmed)) return false;
  return trimmed.length > 40;
}

/* Returns one of:
     { ok: true, client }
     { ok: false, reason: 'missing-config' | 'malformed-url' | 'malformed-key' | 'sdk-not-installed' }

   Callers (e.g. supabase-order-store.js) should treat any !ok result as
   "Supabase is not available right now" and fall back accordingly —
   never crash the customer-facing flow because Supabase isn't configured. */
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return { ok: false, reason: 'missing-config' };
  }
  if (!looksLikeSupabaseUrl(url)) {
    return { ok: false, reason: 'malformed-url' };
  }
  if (!looksLikeServiceRoleKey(serviceRoleKey)) {
    return { ok: false, reason: 'malformed-key' };
  }

  // Cache the client across warm invocations, but rebuild if the
  // configured URL/key pair changes (e.g. between local test runs).
  const cacheKey = `${url}::${serviceRoleKey}`;
  if (cachedClient && cachedClientKey === cacheKey) {
    return { ok: true, client: cachedClient };
  }

  let createClient;
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    ({ createClient } = require('@supabase/supabase-js'));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[supabase-client] "@supabase/supabase-js" is not installed:', e.message);
    return { ok: false, reason: 'sdk-not-installed' };
  }

  try {
    cachedClient = createClient(url.trim(), serviceRoleKey.trim(), {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    cachedClientKey = cacheKey;
    return { ok: true, client: cachedClient };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[supabase-client] Failed to create Supabase client:', e.message);
    return { ok: false, reason: 'client-init-failed' };
  }
}

// Convenience helper: true only when Supabase looks fully configured
// AND the SDK is installed. Used by the webhook to decide, up front,
// whether to attempt Supabase storage or go straight to the dev fallback —
// without instantiating a client just to check.
function isSupabaseConfigured() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && serviceRoleKey && looksLikeSupabaseUrl(url) && looksLikeServiceRoleKey(serviceRoleKey));
}

module.exports = {
  getSupabaseClient,
  isSupabaseConfigured
};
