/* ================================================================
   DURGA DESIGNS — ADMIN ORDER DATA ACCESS (Stage 7, server-side only)
   ================================================================
   Read/update access to paid orders for the admin dashboard, used
   ONLY by netlify/functions/admin-orders.js and
   netlify/functions/admin-order-update.js — both of which verify the
   admin token via lib/admin-auth.js BEFORE calling anything here.

   Like the Stage 6 order-store router, this module picks a backend:
     - Supabase (production-intended) when SUPABASE_URL +
       SUPABASE_SERVICE_ROLE_KEY are present and look valid, or
     - the Stage 5 DEV/TEST-ONLY local file store as a local-testing
       fallback (clearly labelled; never to be relied on for real data).

   Every function returns a NORMALISED shape regardless of backend, so
   the admin functions/frontend never need to know which one is active:

     listOrders()      -> { ok, source, orders: [ { id, orderNumber, date,
                            customerName, customerEmail, totalAmount,
                            currency, paymentStatus, orderStatus }, ... ] }

     getOrder(id)      -> { ok, source, order: {
                            id, orderNumber, stripeSessionId, customerName,
                            customerEmail, customerPhone, address: {...},
                            items: [...], totalAmount, currency,
                            paymentStatus, orderStatus, courier,
                            trackingNumber, adminNotes, statusHistory: [...],
                            createdAt, updatedAt } }

     updateOrder(id, updates) -> { ok, source, order: <same shape as getOrder>,
                                   statusChanged: boolean }

   Card data note: neither backend's order shape ever contains
   payment-instrument data (it never reaches our code in the first
   place — Stripe Checkout handles it). Nothing here introduces any.
   ================================================================ */

'use strict';

const fs = require('fs');
const path = require('path');

const { isSupabaseConfigured, getSupabaseClient } = require('./supabase-client');
const { DEV_ORDERS_DIR } = require('./order-store');

// Single source of truth for allowed admin order statuses — shared by
// both backends and re-exported so admin-order-update.js can validate
// against the exact same list (and report it to the frontend).
const ALLOWED_STATUSES = ['Paid', 'Packing', 'Dispatched', 'Delivered', 'Cancelled', 'Refunded'];

function nowISO() {
  return new Date().toISOString();
}

/* ================================================================
   Supabase backend
   ================================================================ */

function mapSupabaseOrderSummary(row) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    date: row.created_at,
    customerName: row.customer_name || '',
    customerEmail: row.customer_email || '',
    totalAmount: row.total_amount,
    currency: row.currency,
    paymentStatus: row.payment_status,
    orderStatus: row.status
  };
}

function mapSupabaseOrderDetail(row, items, history) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    stripeSessionId: row.stripe_session_id,
    stripePaymentIntentId: row.stripe_payment_intent_id || null,
    customerName: row.customer_name || '',
    customerEmail: row.customer_email || '',
    customerPhone: row.customer_phone || '',
    address: {
      line1: row.address_line1 || '',
      line2: row.address_line2 || '',
      city: row.city || '',
      postcode: row.postcode || '',
      country: row.country || ''
    },
    items: (items || []).map((item) => ({
      slug: item.product_slug,
      title: item.title,
      qty: item.quantity,
      unitAmount: item.unit_amount,
      currency: item.currency
    })),
    totalAmount: row.total_amount,
    subtotalAmount: row.subtotal_amount,
    deliveryAmount: row.delivery_amount,
    currency: row.currency,
    paymentStatus: row.payment_status,
    orderStatus: row.status,
    courier: row.courier || '',
    trackingNumber: row.tracking_number || '',
    adminNotes: row.admin_notes || '',
    statusHistory: (history || []).map((h) => ({
      from: h.from_status,
      to: h.to_status,
      note: h.note || '',
      changedAt: h.changed_at
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function supabaseListOrders(client, limit) {
  const { data, error } = await client
    .from('orders')
    .select('id, order_number, customer_name, customer_email, total_amount, currency, payment_status, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { ok: false, error: error.message };
  return { ok: true, source: 'supabase', orders: (data || []).map(mapSupabaseOrderSummary) };
}

async function supabaseGetOrder(client, id) {
  const { data: row, error } = await client.from('orders').select('*').eq('id', id).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!row) return { ok: false, notFound: true };

  const [{ data: items, error: itemsError }, { data: history, error: historyError }] = await Promise.all([
    client.from('order_items').select('*').eq('order_id', id),
    client.from('order_status_history').select('*').eq('order_id', id).order('changed_at', { ascending: true })
  ]);

  if (itemsError) return { ok: false, error: itemsError.message };
  if (historyError) return { ok: false, error: historyError.message };

  return { ok: true, source: 'supabase', order: mapSupabaseOrderDetail(row, items, history) };
}

async function supabaseUpdateOrder(client, id, updates) {
  const { data: existing, error: fetchError } = await client.from('orders').select('*').eq('id', id).maybeSingle();
  if (fetchError) return { ok: false, error: fetchError.message };
  if (!existing) return { ok: false, notFound: true };

  // Capture the pre-update status value NOW — never read it back off
  // `existing` after issuing the update below. Defensive against any
  // client implementation that might return/mutate shared references.
  const previousStatus = existing.status;

  const patch = { updated_at: nowISO() };
  let statusChanged = false;

  if (typeof updates.status === 'string' && updates.status !== previousStatus) {
    patch.status = updates.status;
    statusChanged = true;
  }
  if (typeof updates.courier === 'string') patch.courier = updates.courier;
  if (typeof updates.trackingNumber === 'string') patch.tracking_number = updates.trackingNumber;
  if (typeof updates.adminNotes === 'string') patch.admin_notes = updates.adminNotes;

  const { data: updatedRow, error: updateError } = await client
    .from('orders')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (updateError) return { ok: false, error: updateError.message };

  if (statusChanged) {
    const { error: historyError } = await client.from('order_status_history').insert({
      order_id: id,
      from_status: previousStatus,
      to_status: patch.status,
      note: typeof updates.statusNote === 'string' ? updates.statusNote.slice(0, 500) : null
    });
    if (historyError) {
      // eslint-disable-next-line no-console
      console.error('[admin-order-data] Order updated but status history insert failed:', historyError.message);
      // Non-fatal — the order row itself is the source of truth.
    }
  }

  const refreshed = await supabaseGetOrder(client, id);
  if (!refreshed.ok) return refreshed;
  return { ok: true, source: 'supabase', order: refreshed.order, statusChanged };
}

/* ================================================================
   DEV/TEST-ONLY file-store backend (local fallback)
   ================================================================
   Reads/updates the same JSON files written by the Stage 5 dev order
   store. The Stage 5 order shape has no admin fields yet, so we add
   them on first update (status defaults to the original orderStatus,
   courier/trackingNumber/adminNotes default to '', statusHistory: []).
   ================================================================ */

function devFilePathForId(id) {
  const safe = String(id || '').replace(/[^A-Za-z0-9_\-]/g, '_');
  return path.join(DEV_ORDERS_DIR, `${safe}.json`);
}

function devReadOrderFile(id) {
  const filePath = devFilePathForId(id);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

// Normalises a raw Stage-5-shaped dev order record (optionally already
// carrying admin fields from a previous update) into the same shape
// the Supabase backend returns, using the dev file's own session ID
// as the admin-facing `id` (there is no separate UUID in the dev store).
function mapDevOrderSummary(raw) {
  return {
    id: raw.stripeSessionId,
    orderNumber: raw.orderNumber,
    date: raw.createdAt,
    customerName: (raw.customer && raw.customer.fullName) || '',
    customerEmail: (raw.customer && raw.customer.email) || '',
    totalAmount: raw.totalAmount,
    currency: raw.currency,
    paymentStatus: raw.paymentStatus,
    orderStatus: raw.status || raw.orderStatus
  };
}

function mapDevOrderDetail(raw) {
  const customer = (raw.customer && typeof raw.customer === 'object') ? raw.customer : {};
  return {
    id: raw.stripeSessionId,
    orderNumber: raw.orderNumber,
    stripeSessionId: raw.stripeSessionId,
    stripePaymentIntentId: raw.stripePaymentIntentId || null,
    customerName: customer.fullName || '',
    customerEmail: customer.email || '',
    customerPhone: customer.phone || '',
    address: {
      line1: customer.address1 || '',
      line2: customer.address2 || '',
      city: customer.city || '',
      postcode: customer.postcode || '',
      country: customer.country || ''
    },
    items: Array.isArray(raw.basketItems) ? raw.basketItems.map((item) => ({
      slug: item.slug,
      title: item.title,
      qty: item.qty,
      unitAmount: item.unitAmount,
      currency: raw.currency
    })) : [],
    totalAmount: raw.totalAmount,
    subtotalAmount: typeof raw.subtotalAmount === 'number' ? raw.subtotalAmount : null,
    deliveryAmount: typeof raw.deliveryAmount === 'number' ? raw.deliveryAmount : null,
    currency: raw.currency,
    paymentStatus: raw.paymentStatus,
    orderStatus: raw.status || raw.orderStatus,
    courier: raw.courier || '',
    trackingNumber: raw.trackingNumber || '',
    adminNotes: raw.adminNotes || '',
    statusHistory: Array.isArray(raw.statusHistory) ? raw.statusHistory.map((h) => ({
      from: h.from,
      to: h.to,
      note: h.note || '',
      changedAt: h.changedAt
    })) : [],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt || raw.createdAt
  };
}

function devListOrdersForAdmin(limit) {
  if (!fs.existsSync(DEV_ORDERS_DIR)) return { ok: true, source: 'dev-fallback', orders: [] };
  try {
    const summaries = fs.readdirSync(DEV_ORDERS_DIR)
      .filter((name) => name.endsWith('.json'))
      .map((name) => {
        try {
          return mapDevOrderSummary(JSON.parse(fs.readFileSync(path.join(DEV_ORDERS_DIR, name), 'utf8')));
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))); // newest first

    return { ok: true, source: 'dev-fallback', orders: summaries.slice(0, limit) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function devGetOrder(id) {
  const raw = devReadOrderFile(id);
  if (!raw) return { ok: false, notFound: true };
  return { ok: true, source: 'dev-fallback', order: mapDevOrderDetail(raw) };
}

function devUpdateOrder(id, updates) {
  const raw = devReadOrderFile(id);
  if (!raw) return { ok: false, notFound: true };

  const previousStatus = raw.status || raw.orderStatus;
  let statusChanged = false;

  if (typeof updates.status === 'string' && updates.status !== previousStatus) {
    raw.status = updates.status;
    statusChanged = true;
  }
  if (typeof updates.courier === 'string') raw.courier = updates.courier;
  if (typeof updates.trackingNumber === 'string') raw.trackingNumber = updates.trackingNumber;
  if (typeof updates.adminNotes === 'string') raw.adminNotes = updates.adminNotes;

  raw.updatedAt = nowISO();

  if (statusChanged) {
    if (!Array.isArray(raw.statusHistory)) raw.statusHistory = [];
    raw.statusHistory.push({
      from: previousStatus,
      to: raw.status,
      note: typeof updates.statusNote === 'string' ? updates.statusNote.slice(0, 500) : '',
      changedAt: raw.updatedAt
    });
  }

  try {
    // Deliberate overwrite (no 'wx') — this is an UPDATE to an existing,
    // already-idempotently-created order record, not a new creation.
    fs.writeFileSync(devFilePathForId(id), JSON.stringify(raw, null, 2));
  } catch (e) {
    return { ok: false, error: e.message };
  }

  return { ok: true, source: 'dev-fallback', order: mapDevOrderDetail(raw), statusChanged };
}

/* ================================================================
   Public routing API used by admin-orders.js / admin-order-update.js
   ================================================================ */

async function listOrders({ limit = 100 } = {}) {
  const safeLimit = Math.max(1, Math.min(200, parseInt(limit, 10) || 100));

  if (isSupabaseConfigured()) {
    const clientCheck = getSupabaseClient();
    if (!clientCheck.ok) return { ok: false, error: `Supabase not available (${clientCheck.reason}).` };
    return supabaseListOrders(clientCheck.client, safeLimit);
  }
  return devListOrdersForAdmin(safeLimit);
}

async function getOrder(id) {
  if (!id) return { ok: false, notFound: true };

  if (isSupabaseConfigured()) {
    const clientCheck = getSupabaseClient();
    if (!clientCheck.ok) return { ok: false, error: `Supabase not available (${clientCheck.reason}).` };
    return supabaseGetOrder(clientCheck.client, id);
  }
  return devGetOrder(id);
}

async function updateOrder(id, updates) {
  if (!id) return { ok: false, notFound: true };

  if (isSupabaseConfigured()) {
    const clientCheck = getSupabaseClient();
    if (!clientCheck.ok) return { ok: false, error: `Supabase not available (${clientCheck.reason}).` };
    return supabaseUpdateOrder(clientCheck.client, id, updates);
  }
  return devUpdateOrder(id, updates);
}

module.exports = {
  ALLOWED_STATUSES,
  listOrders,
  getOrder,
  updateOrder
};
