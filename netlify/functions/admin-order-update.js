/* ================================================================
   DURGA DESIGNS — ADMIN: UPDATE ORDER (Stage 7)
   ================================================================
   Netlify serverless function (NOT deployed yet — local/test only).

   Purpose: let an authenticated admin update an order's fulfilment
   status, courier, tracking number, and admin notes. This is the
   ONLY sanctioned way those fields can ever change — there is no
   public write path, no direct Supabase access from the browser.

   Hard rules enforced here:
     - Every request must present a valid admin token (lib/admin-auth.js).
       Missing → 401. Wrong → 403. Auth not configured → 503.
     - Only a fixed allow-list of fields can be changed:
         status, courier, trackingNumber, adminNotes (+ optional
         statusNote, attached only to the resulting history entry).
       Any other field in the request body is silently ignored —
       this function does not trust or forward arbitrary input to
       the database. (No card data, no totals, no Stripe references,
       no customer details can ever be modified through this endpoint.)
     - `status` must be one of the fixed ALLOWED_STATUSES — anything
       else is rejected with 400.
     - `updated_at` is always refreshed by the data layer.
     - If `status` actually changes, a status-history entry is written
       (Supabase: `order_status_history` row; dev fallback: an in-file
       `statusHistory` array) recording from/to/note/timestamp.
     - Reads/writes route through lib/admin-order-data.js, which itself
       picks Supabase (production-intended) or the DEV/TEST-ONLY file
       store (local fallback) — this function does not need to know which.
   ================================================================ */

'use strict';

const { requireAdmin } = require('./lib/admin-auth');
const { ALLOWED_STATUSES, updateOrder } = require('./lib/admin-order-data');

function jsonResponse(statusCode, bodyObj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyObj)
  };
}

// Strict allow-list projection — anything not listed here is dropped,
// regardless of what the request body contains. This is the main
// defence against "unsafe/unexpected fields" reaching the data layer.
function pickSafeUpdates(rawBody) {
  const safe = {};
  if (!rawBody || typeof rawBody !== 'object') return safe;

  if (typeof rawBody.status === 'string') safe.status = rawBody.status.trim();
  if (typeof rawBody.courier === 'string') safe.courier = rawBody.courier.trim().slice(0, 120);
  if (typeof rawBody.trackingNumber === 'string') safe.trackingNumber = rawBody.trackingNumber.trim().slice(0, 120);
  if (typeof rawBody.adminNotes === 'string') safe.adminNotes = rawBody.adminNotes.trim().slice(0, 2000);
  if (typeof rawBody.statusNote === 'string') safe.statusNote = rawBody.statusNote.trim().slice(0, 500);

  return safe;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'PATCH') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  // 1. Verify the admin token BEFORE doing anything else — including
  //    before parsing the body or touching the order store.
  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  // 2. Parse and sanity-check the request body.
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return jsonResponse(400, { error: 'Could not read the update request.' });
  }

  const id = typeof payload.id === 'string' ? payload.id.trim() : '';
  if (!id) {
    return jsonResponse(400, { error: 'An order id is required.' });
  }

  // 3. Project the request onto a strict allow-list. Anything else —
  //    however it got there — is dropped silently before it ever
  //    reaches the data layer.
  const updates = pickSafeUpdates(payload);

  if (!Object.keys(updates).length) {
    return jsonResponse(400, { error: 'No recognised fields to update were provided.' });
  }

  // 4. Validate `status` against the fixed allow-list of order statuses.
  if (typeof updates.status === 'string' && !ALLOWED_STATUSES.includes(updates.status)) {
    return jsonResponse(400, {
      error: 'That order status is not recognised.',
      developerMessage: `Allowed statuses: ${ALLOWED_STATUSES.join(', ')}`
    });
  }

  try {
    const result = await updateOrder(id, updates);

    if (result.notFound) {
      return jsonResponse(404, { error: 'Order not found.' });
    }
    if (!result.ok) {
      // eslint-disable-next-line no-console
      console.error('[admin-order-update] Failed to update order:', result.error || 'unknown error');
      return jsonResponse(502, {
        error: 'Could not save this update right now. Please try again shortly.',
        developerMessage: result.error || 'Unknown order-store error'
      });
    }

    return jsonResponse(200, {
      source: result.source,
      statusChanged: Boolean(result.statusChanged),
      order: result.order
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[admin-order-update] Unexpected error:', e && e.message);
    return jsonResponse(500, { error: 'Unexpected server error while saving this update.' });
  }
};
