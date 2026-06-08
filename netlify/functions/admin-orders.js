/* ================================================================
   DURGA DESIGNS — ADMIN: LIST ORDERS (Stage 7)
   ================================================================
   Netlify serverless function (NOT deployed yet — local/test only).

   Purpose: return either
     - a LIST of paid orders (default — `GET ?limit=50`), or
     - the DETAIL of a single order (`GET ?id=<orderId>`)
   for the protected admin dashboard. This is the ONLY sanctioned way
   the admin frontend (js/admin-orders.js) ever sees order data —
   there is no public page, no direct Supabase access from the browser,
   and no way to reach this data without a valid ADMIN_ACCESS_TOKEN.

   Hard rules enforced here:
     - Every request must present a valid admin token (lib/admin-auth.js).
       Missing → 401. Wrong → 403. Auth not configured → 503.
     - Reads go through lib/admin-order-data.js, which itself routes to
       Supabase (production-intended) or the DEV/TEST-ONLY file store
       (local fallback) — this function does not need to know which.
     - Only summary fields are returned (order number, date, customer
       name/email, total, payment status, order status) — never full
       card-adjacent detail, and NEVER card data (which never exists
       in our data in the first place).
     - Supports `?limit=` (capped) for safe pagination-lite; always
       sorted newest-first by the underlying store.
   ================================================================ */

'use strict';

const { requireAdmin } = require('./lib/admin-auth');
const { listOrders, getOrder } = require('./lib/admin-order-data');

function jsonResponse(statusCode, bodyObj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyObj)
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  // 1. Verify the admin token BEFORE doing anything else — including
  //    before touching the order store. No token, no data, ever.
  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  const params = (event.queryStringParameters || {});

  // 2a. Single-order detail path: ?id=<orderId>
  if (typeof params.id === 'string' && params.id.trim()) {
    try {
      const result = await getOrder(params.id.trim());
      if (result.notFound) {
        return jsonResponse(404, { error: 'Order not found.' });
      }
      if (!result.ok) {
        // eslint-disable-next-line no-console
        console.error('[admin-orders] Failed to load order detail:', result.error || 'unknown error');
        return jsonResponse(502, {
          error: 'Could not load this order right now. Please try again shortly.',
          developerMessage: result.error || 'Unknown order-store error'
        });
      }
      return jsonResponse(200, { source: result.source, order: result.order });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[admin-orders] Unexpected error loading order detail:', e && e.message);
      return jsonResponse(500, { error: 'Unexpected server error while loading this order.' });
    }
  }

  // 2b. List path (default) — optional, capped limit for safe pagination-lite.
  const limit = parseInt(params.limit, 10);

  try {
    const result = await listOrders({ limit: Number.isFinite(limit) ? limit : 100 });
    if (!result.ok) {
      // eslint-disable-next-line no-console
      console.error('[admin-orders] Failed to list orders:', result.error || 'unknown error');
      return jsonResponse(502, {
        error: 'Could not load orders right now. Please try again shortly.',
        developerMessage: result.error || 'Unknown order-store error'
      });
    }

    return jsonResponse(200, {
      source: result.source, // 'supabase' | 'dev-fallback' — surfaced so the admin UI can show a clear notice
      count: result.orders.length,
      orders: result.orders
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[admin-orders] Unexpected error:', e && e.message);
    return jsonResponse(500, { error: 'Unexpected server error while loading orders.' });
  }
};
