/* ================================================================
   DURGA DESIGNS — ADMIN: (RE)SEND DISPATCH EMAIL (Stage 8)
   ================================================================
   Netlify serverless function (NOT deployed yet — local/test only).

   Purpose: let an authenticated admin manually (re)send the customer
   dispatch/tracking email for a specific order — e.g. if the automatic
   send during an admin-order-update failed, or the courier/tracking
   details were corrected after the first notification went out.

   This is a small, explicit escape hatch alongside the automatic
   trigger in admin-order-update.js (see that file for the "send when
   status becomes Dispatched, or tracking changes" logic). It exists so
   a human always has a clear, auditable way to (re)send this specific
   email without needing to "nudge" an unrelated field just to retrigger
   it — and so this stage has a concrete place to demonstrate
   `sendDispatchEmail()` working as a standalone, admin-gated action.

   Hard rules enforced here (mirrors admin-order-update.js):
     - Every request must present a valid admin token. Missing → 401.
       Wrong → 403. Auth not configured → 503.
     - Only reads the order via lib/admin-order-data.js (which itself
       routes to Supabase or the dev fallback) — no direct DB access,
       no card data, no arbitrary field access.
     - Sending is fully delegated to lib/email-service.js, which owns
       all duplicate-prevention and timestamp-recording logic. This
       function does not talk to the email provider directly.
     - A manual resend always passes `trackingMeaningfullyChanged: true`
       to the service — that is the whole point of an explicit "resend"
       action — but the service still requires RESEND_API_KEY / FROM_EMAIL
       to be configured, and still records the timestamp only after a
       genuinely successful send.
   ================================================================ */

'use strict';

const { requireAdmin } = require('./lib/admin-auth');
const { getOrder } = require('./lib/admin-order-data');
const { sendDispatchEmail } = require('./lib/email-service');

function jsonResponse(statusCode, bodyObj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyObj)
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  // 1. Verify the admin token BEFORE doing anything else.
  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  // 2. Parse and sanity-check the request body.
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return jsonResponse(400, { error: 'Could not read the request.' });
  }

  const id = typeof payload.id === 'string' ? payload.id.trim() : '';
  if (!id) {
    return jsonResponse(400, { error: 'An order id is required.' });
  }

  try {
    const lookup = await getOrder(id);
    if (lookup.notFound) return jsonResponse(404, { error: 'Order not found.' });
    if (!lookup.ok) {
      // eslint-disable-next-line no-console
      console.error('[send-dispatch-email] Failed to load order:', lookup.error || 'unknown error');
      return jsonResponse(502, { error: 'Could not load this order right now. Please try again shortly.' });
    }

    const order = lookup.order;
    if (order.orderStatus !== 'Dispatched') {
      return jsonResponse(409, {
        error: 'This order is not marked as Dispatched.',
        developerMessage: 'The dispatch email is only intended for orders whose current status is "Dispatched". Update the status first, then resend if needed.'
      });
    }

    // An explicit admin action always counts as "meaningful" — that's
    // the entire point of offering a manual resend control.
    const result = await sendDispatchEmail(order, { trackingMeaningfullyChanged: true, reason: 'manual-admin-resend' });

    if (!result.ok) {
      return jsonResponse(502, { error: 'Could not send the dispatch email right now.', developerMessage: result.error });
    }
    if (result.skipped) {
      return jsonResponse(200, { sent: false, skipped: true, reason: result.reason, developerMessage: result.developerMessage });
    }
    return jsonResponse(200, { sent: true, resend: Boolean(result.resend) });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[send-dispatch-email] Unexpected error:', e && e.message);
    return jsonResponse(500, { error: 'Unexpected server error while sending this email.' });
  }
};
