/* ================================================================
   DURGA DESIGNS — ORDER STORE ROUTER (Stage 6)
   ================================================================
   This module is the SINGLE entry point the Stripe webhook uses to
   persist paid orders. It decides — once, per invocation — whether to
   write to Supabase (the intended PRODUCTION store, see
   supabase-order-store.js + supabase/migrations/001_create_orders.sql)
   or to fall back to the throwaway DEV/TEST-ONLY file-based store
   defined further down in this same file.

   Routing rule (deliberately simple and safe):
     - If SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are present and look
       valid  → use Supabase (production-intended path).
     - Otherwise (e.g. local dev with no Supabase project yet) → fall
       back to the DEV/TEST-ONLY file store below, and log a clear
       developer message so nobody mistakes this for production
       behaviour.

   Either way, the calling convention exposed to stripe-webhook.js is
   IDENTICAL:
       hasOrder(sessionId)  -> boolean | Promise<boolean>
       saveOrder(order)     -> { created, alreadyExisted, error? } (sync or Promise)
       listOrders()         -> [ summary, ... ]                    (sync or Promise)

   The webhook handler `await`s every call, which works correctly
   whether the underlying implementation is synchronous (dev file store)
   or asynchronous (Supabase). This keeps stripe-webhook.js free of any
   "which store am I using" branching — exactly the seam Stage 5 was
   designed to leave open.

   IMPORTANT: this file does not, on its own, make Supabase "live" —
   nothing here is deployed, and no real Supabase project has been
   created or connected. It only wires up the *code path* so that the
   moment real SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY values exist in
   the environment, orders start flowing into Postgres instead of disk.
   ================================================================ */

'use strict';

const fs = require('fs');
const path = require('path');

const { isSupabaseConfigured } = require('./supabase-client');
const supabaseOrderStore = require('./supabase-order-store');

let loggedRoutingDecision = false;

function logRoutingDecisionOnce() {
  if (loggedRoutingDecision) return;
  loggedRoutingDecision = true;
  if (isSupabaseConfigured()) {
    // eslint-disable-next-line no-console
    console.log('[order-store] Supabase is configured — routing orders to Supabase Postgres (production-intended store).');
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      '[order-store] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set (or do not look valid) — ' +
      'falling back to the DEV/TEST-ONLY local file order store. This is expected for local development ' +
      'without a Supabase project, but MUST NOT happen in any environment that handles real customer orders. ' +
      'See docs/supabase-setup.md to configure Supabase.'
    );
  }
}

/* ── Public routing API used by stripe-webhook.js ────────────────── */

async function hasOrder(sessionId) {
  logRoutingDecisionOnce();
  if (isSupabaseConfigured()) {
    return supabaseOrderStore.hasOrder(sessionId);
  }
  return devHasOrder(sessionId);
}

async function saveOrder(order) {
  logRoutingDecisionOnce();
  if (isSupabaseConfigured()) {
    return supabaseOrderStore.saveOrder(order);
  }
  return devSaveOrder(order);
}

async function listOrders() {
  logRoutingDecisionOnce();
  if (isSupabaseConfigured()) {
    return supabaseOrderStore.listOrders();
  }
  return devListOrders();
}

/* ================================================================
   ⚠️  DEV/TEST-ONLY ORDER STORE — NOT FOR PRODUCTION USE  ⚠️
   ================================================================
   DURGA DESIGNS — Stage 5 temporary order persistence, KEPT as a
   local-development fallback only (Stage 6 routing decides when this
   is used — see logRoutingDecisionOnce()/hasOrder()/saveOrder() above).

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

   Now that Supabase is wired up (Stage 6), this only runs when
   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are absent — i.e. local
   development without a configured Supabase project. It is kept,
   rather than deleted, purely so the webhook can still be exercised
   end-to-end without any external dependencies.

   IMPORTANT: data/dev-orders/ is listed in .gitignore — real or test
   order data must NEVER be committed to the repository.
   ================================================================ */

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

function devHasOrder(sessionId) {
  if (!sessionId) return false;
  if (!ensureDirExists()) return false;
  const filePath = path.join(DEV_ORDERS_DIR, fileNameForSession(sessionId));
  return fs.existsSync(filePath);
}

// Persists the order. Returns { created: boolean, alreadyExisted: boolean }.
// Uses an exclusive-write flag ('wx') so two near-simultaneous webhook
// deliveries for the same session can't both "win" and overwrite the order.
function devSaveOrder(order) {
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
function devListOrders() {
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
