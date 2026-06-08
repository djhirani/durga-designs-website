/* ================================================================
   DURGA DESIGNS — SUPABASE ORDER STORE (Stage 6)
   ================================================================
   The intended PRODUCTION order store, backed by Supabase Postgres
   (see supabase/migrations/001_create_orders.sql for the schema).

   This module exists ONLY to be called from server-side serverless
   functions (the Stripe webhook). It must never be reachable from,
   or imported by, frontend-servable code.

   Calling convention deliberately mirrors the Stage 5 dev file store
   (netlify/functions/lib/order-store.js) so the webhook handler does
   not need to change shape when switching between them:

     hasOrder(sessionId)        -> boolean
     saveOrder(order)           -> { created, alreadyExisted, error? }
     listOrders()               -> [ summary, ... ]   (debug helper only)

   Idempotency:
     The `orders.stripe_session_id` column has a UNIQUE constraint
     (see migration 001). We INSERT with `.select()` and treat a
     unique-violation error (Postgres code 23505) as "already exists" —
     exactly mirroring the dev store's EEXIST handling. This means two
     near-simultaneous webhook deliveries for the same session can never
     both succeed in creating a row; the database itself enforces it.

   Data hygiene:
     - Only ever called with an order object that has already been built
       from Stripe-confirmed session data and run through
       sanitiseCustomerDetails() / stripForbiddenFields() in
       order-utils.js. This module does not re-trust or re-derive
       anything from raw input — it only maps the already-sanitised
       order shape onto database columns.
     - No card numbers, CVC, or other payment-instrument data is ever
       part of the order shape this module receives or stores.
   ================================================================ */

'use strict';

const { getSupabaseClient } = require('./supabase-client');

const UNIQUE_VIOLATION = '23505';

// Maps the Stage-5-shaped `order` object (see stripe-webhook.js) onto
// the `orders` + `order_items` table columns from migration 001.
// Amounts are kept as GBP decimal pounds (e.g. 24.50) — matching both
// the dev order shape and the `numeric(10,2)` column types.
function toOrderRow(order) {
  const customer = (order && order.customer && typeof order.customer === 'object') ? order.customer : {};
  return {
    order_number: order.orderNumber || null,

    stripe_session_id: order.stripeSessionId,
    stripe_payment_intent_id: order.stripePaymentIntentId || null,
    stripe_event_id: order.stripeEventId || null,

    customer_name: customer.fullName || null,
    customer_email: customer.email || null,
    customer_phone: customer.phone || null,
    address_line1: customer.address1 || null,
    address_line2: customer.address2 || null,
    city: customer.city || null,
    postcode: customer.postcode || null,
    country: customer.country || null,

    subtotal_amount: typeof order.subtotalAmount === 'number' ? order.subtotalAmount : null,
    delivery_amount: typeof order.deliveryAmount === 'number' ? order.deliveryAmount : null,
    total_amount: order.totalAmount,
    currency: (order.currency || 'gbp').toLowerCase(),

    payment_status: order.paymentStatus || 'paid',
    status: 'paid'
  };
}

function toOrderItemRows(orderId, basketItems) {
  if (!Array.isArray(basketItems)) return [];
  return basketItems
    .filter((item) => item && typeof item === 'object' && item.slug)
    .map((item) => ({
      order_id: orderId,
      product_slug: String(item.slug),
      title: typeof item.title === 'string' ? item.title.slice(0, 300) : String(item.slug),
      quantity: Math.max(1, parseInt(item.qty, 10) || 1),
      unit_amount: typeof item.unitAmount === 'number' ? item.unitAmount : 0,
      currency: (item.currency || 'gbp').toLowerCase()
    }));
}

// Returns boolean. On any unexpected error we deliberately return
// `false` (i.e. "not known to exist yet") rather than throwing —
// the subsequent saveOrder() unique-constraint check is the real
// duplicate-prevention backstop, so a transient read failure here
// cannot itself cause a duplicate to be written.
async function hasOrder(sessionId) {
  if (!sessionId) return false;

  const clientCheck = getSupabaseClient();
  if (!clientCheck.ok) return false;

  try {
    const { data, error } = await clientCheck.client
      .from('orders')
      .select('id')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[supabase-order-store] hasOrder() lookup failed:', error.message);
      return false;
    }
    return Boolean(data);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[supabase-order-store] hasOrder() unexpected error:', e.message);
    return false;
  }
}

// Persists the order + its line items. Returns the same shape as the
// dev file store: { created, alreadyExisted, error? }.
//
// Duplicate prevention relies on the database-level UNIQUE constraint
// on orders.stripe_session_id (migration 001) — NOT on the hasOrder()
// pre-check above (which is only a fast-path optimisation to avoid
// unnecessary work; the constraint is the actual guarantee).
async function saveOrder(order) {
  if (!order || !order.stripeSessionId) {
    return { created: false, alreadyExisted: false, error: 'Missing stripeSessionId — refusing to save.' };
  }

  const clientCheck = getSupabaseClient();
  if (!clientCheck.ok) {
    return { created: false, alreadyExisted: false, error: `Supabase not available (${clientCheck.reason}).` };
  }

  const client = clientCheck.client;
  const orderRow = toOrderRow(order);

  try {
    const { data: insertedOrder, error: insertError } = await client
      .from('orders')
      .insert(orderRow)
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === UNIQUE_VIOLATION) {
        // Another delivery already created this order — exactly the
        // duplicate-prevention behaviour we want. Not an error.
        return { created: false, alreadyExisted: true };
      }
      // eslint-disable-next-line no-console
      console.error('[supabase-order-store] Failed to insert order row:', insertError.message);
      return { created: false, alreadyExisted: false, error: insertError.message };
    }

    // Order row created — now insert its line items (best-effort; the
    // order itself is already safely persisted and idempotent at this point).
    const itemRows = toOrderItemRows(insertedOrder.id, order.basketItems);
    if (itemRows.length) {
      const { error: itemsError } = await client.from('order_items').insert(itemRows);
      if (itemsError) {
        // eslint-disable-next-line no-console
        console.error('[supabase-order-store] Order saved but line items failed to insert:', itemsError.message);
        // We do not fail the whole save — the order itself is the
        // source of truth and is safely recorded; line items can be
        // backfilled/reviewed by an admin later (Stage 7).
      }
    }

    return { created: true, alreadyExisted: false };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[supabase-order-store] Unexpected error while saving order:', e.message);
    return { created: false, alreadyExisted: false, error: e.message };
  }
}

// Dev/debug helper only — NOT used by the webhook handler itself.
// Returns lightweight summaries, never full customer details, mirroring
// the dev file store's listOrders().
async function listOrders() {
  const clientCheck = getSupabaseClient();
  if (!clientCheck.ok) return [];

  try {
    const { data, error } = await clientCheck.client
      .from('orders')
      .select('order_number, stripe_session_id, status, total_amount, currency, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[supabase-order-store] listOrders() failed:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      orderNumber: row.order_number,
      stripeSessionId: row.stripe_session_id,
      status: row.status,
      totalAmount: row.total_amount,
      currency: row.currency,
      createdAt: row.created_at
    }));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[supabase-order-store] listOrders() unexpected error:', e.message);
    return [];
  }
}

module.exports = {
  hasOrder,
  saveOrder,
  listOrders
};
