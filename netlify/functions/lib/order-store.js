/* ================================================================
   ⚠️  DEV/TEST-ONLY ORDER STORE — NOT FOR PRODUCTION USE  ⚠️
   ================================================================
   DURGA DESIGNS — Stage 5 temporary order persistence

   This is a throwaway, file-based "order store" that exists ONLY so
   we can prove the Stripe webhook → order-creation flow end-to-end
   in local/test mode before Supabase is wired up in Stage 6.

   What it is:
     - Writes one JSON file per order to data/dev-orders/ (local disk)
     - Uses the Stripe Checkout Session ID as an idempotency key, so a
       retried webhook delivery can NEVER create a duplicate order
     - Clearly namespaced/labelled "dev" everywhere so nobody mistakes
       it for real infrastructure

   What it is NOT:
     - NOT a database. No transactions, no concurrency guarantees beyond
       a simple "does this file already exist" check, no querying.
     - NOT suitable for Netlify's production (read-only, ephemeral
       filesystem) — this only works for local `netlify dev` testing.
     - NOT where real customer orders should ever live.

   How this gets replaced in Stage 6:
     Swap the three functions below (`hasOrder`, `saveOrder`, `listOrders`)
     for equivalent calls to Supabase (e.g. `select … where stripe_session_id
     = ?`, `insert … on conflict (stripe_session_id) do nothing`, etc.).
     The webhook handler that calls this module should not need to change
     its calling convention — only this file's internals.

   IMPORTANT: data/dev-orders/ is listed in .gitignore — real or test
   order data must NEVER be committed to the repository.
   ================================================================ */

'use strict';

const fs = require('fs');
const path = require('path');

const DEV_ORDERS_DIR = path.join(__dirname, '..', '..', '..', 'data', 'dev-orders');

function ensureDirExists() {
  try {
    fs.mkdirSync(DEV_ORDERS_DIR, { recursive: true });
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[order-store:DEV-ONLY] Could not create dev-orders directory:', e.message);
    return false;
  }
}

// Idempotency key: one file per Stripe Checkout Session ID. If the file
// already exists, this session has already produced an order — Stripe's
// "at least once" webhook delivery can safely retry without duplicating.
function fileNameForSession(sessionId) {
  const safe = String(sessionId || 'unknown').replace(/[^A-Za-z0-9_\-]/g, '_');
  return `${safe}.json`;
}

function hasOrder(sessionId) {
  if (!sessionId) return false;
  if (!ensureDirExists()) return false;
  const filePath = path.join(DEV_ORDERS_DIR, fileNameForSession(sessionId));
  return fs.existsSync(filePath);
}

// Persists the order. Returns { created: boolean, alreadyExisted: boolean }.
// Uses an exclusive-write flag ('wx') so two near-simultaneous webhook
// deliveries for the same session can't both "win" and overwrite the order.
function saveOrder(order) {
  if (!order || !order.stripeSessionId) {
    return { created: false, alreadyExisted: false, error: 'Missing stripeSessionId — refusing to save.' };
  }
  if (!ensureDirExists()) {
    return { created: false, alreadyExisted: false, error: 'Dev order directory unavailable.' };
  }

  const filePath = path.join(DEV_ORDERS_DIR, fileNameForSession(order.stripeSessionId));

  try {
    fs.writeFileSync(filePath, JSON.stringify(order, null, 2), { flag: 'wx' });
    return { created: true, alreadyExisted: false };
  } catch (e) {
    if (e && e.code === 'EEXIST') {
      // Another delivery already created this order — exactly the
      // duplicate-prevention behaviour we want. Not an error.
      return { created: false, alreadyExisted: true };
    }
    // eslint-disable-next-line no-console
    console.error('[order-store:DEV-ONLY] Failed to write order file:', e.message);
    return { created: false, alreadyExisted: false, error: e.message };
  }
}

// Dev/debug helper only — lists order summaries without leaking full
// customer details into logs. Not used by the webhook handler itself.
function listOrders() {
  if (!ensureDirExists()) return [];
  try {
    return fs.readdirSync(DEV_ORDERS_DIR)
      .filter((name) => name.endsWith('.json'))
      .map((name) => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(DEV_ORDERS_DIR, name), 'utf8'));
          return {
            orderNumber: data.orderNumber,
            stripeSessionId: data.stripeSessionId,
            status: data.orderStatus,
            totalAmount: data.totalAmount,
            currency: data.currency,
            createdAt: data.createdAt
          };
        } catch (e) {
          return { file: name, error: 'unreadable' };
        }
      });
  } catch (e) {
    return [];
  }
}

module.exports = {
  DEV_ORDERS_DIR,
  hasOrder,
  saveOrder,
  listOrders
};
