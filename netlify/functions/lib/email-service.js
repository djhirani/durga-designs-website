/* ================================================================
   DURGA DESIGNS — EMAIL SERVICE (server-side only) — Stage 8
   ================================================================
   The single place that decides WHETHER to send a transactional email,
   builds it (via email-templates.js), sends it (via email-client.js),
   and — only after a successful send — records the corresponding
   `*_email_sent_at` timestamp via the order-store router so the same
   email is never sent twice.

   Exposed functions (the only ones other modules should call):
     sendCustomerConfirmation(order)
     sendAdminNewOrder(order, opts)
     sendDispatchEmail(order, opts)

   Every function returns a normalised result and NEVER throws:
     { ok: true,  sent: true,  id }
     { ok: true,  sent: false, skipped: true,  reason }   // not configured / already sent / nothing to do
     { ok: false, sent: false, error }                     // configured, attempted, but failed

   Hard rule: a failed or skipped email NEVER becomes a thrown
   exception that could break order creation or an admin update —
   callers (stripe-webhook.js / admin-order-update.js) wrap these in
   their own try/catch as a second line of defence, but every code
   path in here already resolves safely on its own.
   ================================================================ */

'use strict';

const emailClient = require('./email-client');
const templates = require('./email-templates');
const orderStore = require('./order-store');

// Where the (locally-running, NOT deployed) admin dashboard can be
// reached from — used only to build a clickable link in the admin
// new-order email. SITE_URL is already a documented env var (Stage 5).
function buildAdminOrderUrl(order) {
  const base = process.env.SITE_URL;
  if (!base || typeof base !== 'string') return null;
  const trimmed = base.replace(/\/+$/, '');
  const id = (order && (order.id || order.stripeSessionId)) || '';
  if (!id) return `${trimmed}/admin/orders/index.html`;
  return `${trimmed}/admin/order.html?id=${encodeURIComponent(id)}`;
}

function getCustomerEmail(order) {
  const o = order || {};
  return o.customerEmail || (o.customer && o.customer.email) || '';
}

/* ================================================================
   1. Customer order confirmation
   ================================================================ */

async function sendCustomerConfirmation(order) {
  const o = order || {};
  const to = getCustomerEmail(o);
  if (!to) {
    return { ok: true, sent: false, skipped: true, reason: 'no-customer-email' };
  }
  if (!o.stripeSessionId) {
    return { ok: false, sent: false, error: 'Order is missing a stripeSessionId — refusing to send (cannot prevent duplicates safely).' };
  }

  // Defence in depth: the webhook only calls this on first-ever creation
  // of the order (result.created === true), but we double-check the
  // persisted flag too, in case this is ever called from elsewhere.
  const status = await orderStore.getOrderEmailStatus(o.stripeSessionId);
  if (status && status.confirmationEmailSentAt) {
    return { ok: true, sent: false, skipped: true, reason: 'already-sent' };
  }

  const { subject, html, text } = templates.customerConfirmationEmail(o);
  const result = await emailClient.sendEmail({ to, subject, html, text });

  if (result.skipped) return { ok: true, sent: false, skipped: true, reason: result.reason, developerMessage: result.developerMessage };
  if (!result.ok) return { ok: false, sent: false, error: result.error };

  const recorded = await orderStore.markOrderEmailSent(o.stripeSessionId, 'confirmationEmailSentAt');
  if (!recorded.ok) {
    // eslint-disable-next-line no-console
    console.error('[email-service] Confirmation email sent but timestamp could not be recorded:', recorded.error);
    // Non-fatal — the email genuinely went out. Worst case on a future
    // webhook replay (which is already blocked upstream by hasOrder())
    // is a duplicate-send risk if this ever ran outside that guard.
  }

  return { ok: true, sent: true, id: result.id || null };
}

/* ================================================================
   2. Admin new-order notification
   ================================================================ */

async function sendAdminNewOrder(order, opts) {
  const o = order || {};
  const to = process.env.ADMIN_ORDER_EMAIL;
  if (!to || !to.trim()) {
    return { ok: true, sent: false, skipped: true, reason: 'missing-admin-order-email', developerMessage: 'ADMIN_ORDER_EMAIL is not set — see .env.example / docs/email-setup.md.' };
  }
  if (!o.stripeSessionId) {
    return { ok: false, sent: false, error: 'Order is missing a stripeSessionId — refusing to send (cannot prevent duplicates safely).' };
  }

  const status = await orderStore.getOrderEmailStatus(o.stripeSessionId);
  if (status && status.adminEmailSentAt) {
    return { ok: true, sent: false, skipped: true, reason: 'already-sent' };
  }

  const { subject, html, text } = templates.adminNewOrderEmail(o, { adminOrderUrl: buildAdminOrderUrl(o) });
  const result = await emailClient.sendEmail({ to: to.trim(), subject, html, text });

  if (result.skipped) return { ok: true, sent: false, skipped: true, reason: result.reason, developerMessage: result.developerMessage };
  if (!result.ok) return { ok: false, sent: false, error: result.error };

  const recorded = await orderStore.markOrderEmailSent(o.stripeSessionId, 'adminEmailSentAt');
  if (!recorded.ok) {
    // eslint-disable-next-line no-console
    console.error('[email-service] Admin notification sent but timestamp could not be recorded:', recorded.error);
  }

  return { ok: true, sent: true, id: result.id || null };
}

/* ================================================================
   3. Customer dispatch / tracking email
   ================================================================ */

// `opts.reason` documents WHY the caller believes this is worth sending —
// purely for logging/clarity, it does not change behaviour here (the
// gate-keeping decision of "should we even consider sending?" belongs
// to admin-order-update.js, which has the before/after diff; this
// function's job is the final "have we already told them this exact
// thing?" duplicate check).
async function sendDispatchEmail(order, opts) {
  const o = order || {};
  const o2 = opts || {};
  const to = getCustomerEmail(o);
  if (!to) {
    return { ok: true, sent: false, skipped: true, reason: 'no-customer-email' };
  }
  if (!o.stripeSessionId) {
    return { ok: false, sent: false, error: 'Order is missing a stripeSessionId — refusing to send (cannot prevent duplicates safely).' };
  }

  const status = await orderStore.getOrderEmailStatus(o.stripeSessionId);
  const alreadySent = Boolean(status && status.dispatchEmailSentAt);

  // Send when: this is the first dispatch notification for this order,
  // OR the caller has determined the tracking details meaningfully
  // changed since the last one went out (e.g. courier/tracking number
  // added or corrected after the initial "Dispatched" email).
  if (alreadySent && !o2.trackingMeaningfullyChanged) {
    return { ok: true, sent: false, skipped: true, reason: 'already-sent' };
  }

  const { subject, html, text } = templates.customerDispatchEmail(o);
  const result = await emailClient.sendEmail({ to, subject, html, text });

  if (result.skipped) return { ok: true, sent: false, skipped: true, reason: result.reason, developerMessage: result.developerMessage };
  if (!result.ok) return { ok: false, sent: false, error: result.error };

  const recorded = await orderStore.markOrderEmailSent(o.stripeSessionId, 'dispatchEmailSentAt');
  if (!recorded.ok) {
    // eslint-disable-next-line no-console
    console.error('[email-service] Dispatch email sent but timestamp could not be recorded:', recorded.error);
  }

  return { ok: true, sent: true, id: result.id || null, resend: alreadySent };
}

module.exports = {
  sendCustomerConfirmation,
  sendAdminNewOrder,
  sendDispatchEmail
};
