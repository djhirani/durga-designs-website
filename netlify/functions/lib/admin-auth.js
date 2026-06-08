/* ================================================================
   DURGA DESIGNS — ADMIN AUTH (Stage 7, TEMPORARY token gate)
   ================================================================
   Centralises verification of the admin access token used to gate
   every admin Netlify Function (admin-orders.js, admin-order-update.js).

   This is DELIBERATELY simple and TEMPORARY:
     - A single shared secret (`ADMIN_ACCESS_TOKEN`), set as a
       server-side environment variable only.
     - The admin frontend (js/admin-orders.js) asks the person running
       it to paste this token into a form field; it is kept only in
       memory/sessionStorage for that browser session, sent as a
       request header, and NEVER written to any committed file.
     - This is a stop-gap, not a real authentication system (no users,
       no roles, no sessions, no password hashing). A proper auth
       system can replace this later without changing the calling
       convention other admin functions rely on
       (`requireAdmin(event) -> { ok, statusCode, body? }`).

   Hard rules enforced here:
     - ADMIN_ACCESS_TOKEN is read from process.env only — never
       hardcoded, never logged in full.
     - If the env var is missing, every admin request is safely
       rejected (503) — we never "fail open".
     - If the request's token is missing or wrong, we reject with
       401 (missing) or 403 (present but wrong) — never leak *why*
       beyond that distinction, and never echo the submitted token
       back in any response or log line.
     - Comparison uses a constant-time check to reduce timing-attack
       surface (defence in depth for a temporary scheme).
   ================================================================ */

'use strict';

const crypto = require('crypto');

function jsonResponse(statusCode, bodyObj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyObj)
  };
}

// Constant-time string comparison — avoids leaking how many leading
// characters matched via response-time differences. Both inputs are
// hashed to a fixed length first so differing lengths don't short-circuit.
function safeEqual(a, b) {
  const bufA = crypto.createHash('sha256').update(String(a)).digest();
  const bufB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

function extractSubmittedToken(event) {
  const headers = (event && event.headers) || {};
  // Accept either a dedicated header or a standard Bearer Authorization
  // header — the frontend uses the dedicated one, but both are supported
  // so this can be tested with simple curl/Stripe-CLI-style tooling too.
  const direct = headers['x-admin-token'] || headers['X-Admin-Token'];
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  const authHeader = headers['authorization'] || headers['Authorization'];
  if (typeof authHeader === 'string') {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match && match[1].trim()) return match[1].trim();
  }
  return '';
}

/* Returns one of:
     { ok: true }
     { ok: false, response: <Netlify function response object> }

   Usage in an admin function:
     const auth = requireAdmin(event);
     if (!auth.ok) return auth.response;
*/
function requireAdmin(event) {
  const configuredToken = process.env.ADMIN_ACCESS_TOKEN;

  if (!configuredToken || !configuredToken.trim()) {
    // eslint-disable-next-line no-console
    console.error('[admin-auth] ADMIN_ACCESS_TOKEN is not set — refusing all admin requests.');
    return {
      ok: false,
      response: jsonResponse(503, {
        error: 'Admin access is not configured for this environment.',
        developerMessage:
          'Set ADMIN_ACCESS_TOKEN (a long random string, server-side only) in your local environment ' +
          '(see .env.example) to enable the admin dashboard. Never commit a real value.'
      })
    };
  }

  const submitted = extractSubmittedToken(event);
  if (!submitted) {
    // eslint-disable-next-line no-console
    console.warn('[admin-auth] Rejected admin request with no token.');
    return {
      ok: false,
      response: jsonResponse(401, { error: 'Admin token required.' })
    };
  }

  if (!safeEqual(submitted, configuredToken.trim())) {
    // eslint-disable-next-line no-console
    console.warn('[admin-auth] Rejected admin request with an incorrect token.');
    return {
      ok: false,
      response: jsonResponse(403, { error: 'Admin token is not valid.' })
    };
  }

  return { ok: true };
}

module.exports = {
  requireAdmin
};
