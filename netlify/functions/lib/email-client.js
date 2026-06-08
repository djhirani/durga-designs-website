/* ================================================================
   DURGA DESIGNS — EMAIL CLIENT (server-side only) — Stage 8
   ================================================================
   Thin wrapper around the Resend transactional-email HTTP API
   (https://resend.com/docs/api-reference/emails/send-email).

   Why a hand-rolled HTTP wrapper instead of the `resend` npm package?
     - Resend's send-email endpoint is a single, simple POST with a
       JSON body and a Bearer token — no SDK is required to use it.
     - This keeps the project's dependency footprint unchanged (per
       Stage 8 instructions: "do not install permanent packages unless
       necessary"), and mirrors the lazy-require pattern already used
       for `stripe`/`@supabase/supabase-js` — except here we don't even
       need a third-party package, just Node's built-in `https` module.
     - It is trivial to swap this file out for the official SDK, or for
       a different provider entirely (Postmark, SES, etc.) later — every
       other Stage 8 module only ever calls `sendEmail()` from here.

   This module is for SERVERLESS FUNCTIONS ONLY. It must NEVER be
   imported from, or its output exposed to, any frontend-servable file —
   RESEND_API_KEY is exactly as sensitive as STRIPE_SECRET_KEY or
   SUPABASE_SERVICE_ROLE_KEY and must stay server-side only.

   Behaviour:
     - getEmailConfig() returns { ok:false, reason } if RESEND_API_KEY,
       FROM_EMAIL (or, where required, ADMIN_ORDER_EMAIL) are missing —
       it never throws, so callers can fail safely with a clear
       developer-facing message instead of crashing the order flow.
     - sendEmail() performs the actual HTTP call and normalises the
       result to { ok, id?, error?, skipped?, reason? }.
   ================================================================ */

'use strict';

const https = require('https');

const RESEND_API_HOST = 'api.resend.com';
const RESEND_API_PATH = '/emails';

// Loosely validate "looks like an email address" — good enough for a
// fail-safe guard; Resend itself will reject anything genuinely invalid.
function looksLikeEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function looksLikeResendKey(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || /REPLACE_ME/i.test(trimmed)) return false;
  // Resend API keys look like "re_xxxxxxxx...". We don't hard-require the
  // prefix (so other providers could be slotted in behind this same
  // wrapper later), but we do refuse obvious placeholders/empty values.
  return trimmed.length > 10;
}

/* Returns one of:
     { ok: true, apiKey, fromEmail }
     { ok: false, reason: 'missing-api-key' | 'malformed-api-key' | 'missing-from-email' | 'malformed-from-email' }

   Callers should treat any !ok result as "email sending is not available
   right now" and fail safely — never let a missing email configuration
   break order creation or admin updates. */
function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;

  if (!apiKey || !apiKey.trim()) return { ok: false, reason: 'missing-api-key' };
  if (!looksLikeResendKey(apiKey)) return { ok: false, reason: 'malformed-api-key' };

  if (!fromEmail || !fromEmail.trim()) return { ok: false, reason: 'missing-from-email' };
  if (!looksLikeEmail(fromEmail) && !/<[^>]+>/.test(fromEmail)) {
    // Resend accepts "Name <address@domain>" as well as a bare address —
    // only reject things that look like neither.
    return { ok: false, reason: 'malformed-from-email' };
  }

  return { ok: true, apiKey: apiKey.trim(), fromEmail: fromEmail.trim() };
}

function humanConfigReason(reason) {
  switch (reason) {
    case 'missing-api-key':
      return 'RESEND_API_KEY is not set. Add it to your local environment (see .env.example / docs/email-setup.md). Emails will not be sent until it is configured.';
    case 'malformed-api-key':
      return 'RESEND_API_KEY does not look like a real key (placeholder or too short). Replace it with a real Resend API key for local testing, or leave it unset to keep emails disabled.';
    case 'missing-from-email':
      return 'FROM_EMAIL is not set. Add a verified sender address to your local environment (see .env.example / docs/email-setup.md).';
    case 'malformed-from-email':
      return 'FROM_EMAIL does not look like a valid email address (e.g. "Durga Designs <orders@yourdomain.example>").';
    default:
      return 'Email sending is not configured for this environment.';
  }
}

// Performs the actual HTTP POST to Resend. Returns a normalised result —
// never throws. `payload` should already be a fully-formed Resend
// "send email" request body (to/from/subject/html/text).
function postToResend(apiKey, payload) {
  return new Promise((resolve) => {
    let body;
    try {
      body = JSON.stringify(payload);
    } catch (e) {
      resolve({ ok: false, error: 'Could not serialise email payload.' });
      return;
    }

    const req = https.request(
      {
        hostname: RESEND_API_HOST,
        path: RESEND_API_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Authorization: `Bearer ${apiKey}`
        },
        timeout: 15000
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          let parsed = null;
          try { parsed = raw ? JSON.parse(raw) : null; } catch (e) { parsed = null; }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ ok: true, id: parsed && parsed.id ? parsed.id : null });
          } else {
            const message = (parsed && (parsed.message || parsed.error)) || `Resend API responded with HTTP ${res.statusCode}`;
            resolve({ ok: false, error: typeof message === 'string' ? message : JSON.stringify(message) });
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Resend API request timed out.'));
    });
    req.on('error', (err) => {
      resolve({ ok: false, error: (err && err.message) || 'Network error while contacting the email provider.' });
    });

    req.write(body);
    req.end();
  });
}

/* sendEmail({ to, subject, html, text, replyTo? })
   -> { ok: true, sent: true, id }
    | { ok: true, sent: false, skipped: true, reason }   // not configured — safe no-op
    | { ok: false, error }                               // configured but the send failed

   `to` may be a single address or an array of addresses. The `from`
   address always comes from FROM_EMAIL (server-side env) — callers
   never get to choose it, which keeps every outgoing email consistent
   with whatever sender identity has been verified with Resend. */
async function sendEmail({ to, subject, html, text, replyTo } = {}) {
  const config = getEmailConfig();
  if (!config.ok) {
    // eslint-disable-next-line no-console
    console.warn(`[email-client] Skipping send — ${humanConfigReason(config.reason)}`);
    return { ok: true, sent: false, skipped: true, reason: config.reason, developerMessage: humanConfigReason(config.reason) };
  }

  const recipients = Array.isArray(to) ? to.filter(looksLikeEmail) : (looksLikeEmail(to) ? [to] : []);
  if (!recipients.length) {
    return { ok: false, error: 'No valid recipient email address was provided.' };
  }
  if (typeof subject !== 'string' || !subject.trim()) {
    return { ok: false, error: 'Email subject is required.' };
  }
  if ((typeof html !== 'string' || !html.trim()) && (typeof text !== 'string' || !text.trim())) {
    return { ok: false, error: 'Email body (html or text) is required.' };
  }

  const payload = {
    from: config.fromEmail,
    to: recipients,
    subject: subject.trim()
  };
  if (typeof html === 'string' && html.trim()) payload.html = html;
  if (typeof text === 'string' && text.trim()) payload.text = text;
  if (looksLikeEmail(replyTo)) payload.reply_to = replyTo;

  try {
    const result = await postToResend(config.apiKey, payload);
    if (!result.ok) {
      // eslint-disable-next-line no-console
      console.error('[email-client] Resend API send failed:', result.error);
      return { ok: false, error: result.error };
    }
    return { ok: true, sent: true, id: result.id || null };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[email-client] Unexpected error while sending email:', e && e.message);
    return { ok: false, error: (e && e.message) || 'Unexpected error while sending email.' };
  }
}

module.exports = {
  getEmailConfig,
  humanConfigReason,
  sendEmail
};
