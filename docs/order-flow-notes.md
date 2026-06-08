# Durga Designs — Order Flow Notes (Stages 5 & 6: Webhook + Order Storage)

> **Status: TEST MODE ONLY. NOT DEPLOYED.** Nothing here is connected to
> live Stripe keys, a real/connected Supabase project, an admin dashboard,
> or email. This document describes how the pieces fit together right now,
> and what changes in Stages 7 and 8.
>
> **Stage 6 update:** Supabase Postgres storage code has now been added
> (see `supabase/migrations/001_create_orders.sql`,
> `netlify/functions/lib/supabase-client.js`, and
> `netlify/functions/lib/supabase-order-store.js`) and is the *intended
> production* order store. The Stage 5 dev file store still exists as a
> local-only fallback — see "How order storage is routed" below.

## How a test order is created today

1. **Customer fills in checkout** (`checkout.html` / `js/checkout.js`) and
   clicks "Pay Securely with Stripe (Test Mode)" — only possible when every
   basket item has a confirmed numeric price (never "Price on request").
2. **`netlify/functions/create-checkout-session.js`** re-validates every
   item against its own server-side `SAFE_PRODUCT_MAP` (frontend prices are
   never trusted), builds a Stripe Checkout Session in **GBP, test mode**,
   attaches a small, sanitised metadata snapshot of the customer/basket
   (see "What goes into session metadata" below), and returns the
   Stripe-hosted Checkout URL.
3. **Stripe hosts the actual payment page.** Card details are entered only
   on Stripe's domain — Durga Designs never sees or stores them.
4. **Stripe redirects** the customer back to `order-success.html` (on
   success) or `order-cancelled.html` (on cancel).
5. **Stripe also sends a webhook event** to
   `netlify/functions/stripe-webhook.js`. That function:
   - verifies the request's signature against `STRIPE_WEBHOOK_SECRET`
     (rejecting anything that isn't genuinely from Stripe),
   - ignores every event type except `checkout.session.completed`,
   - checks `payment_status === 'paid'`,
   - uses the **Stripe Checkout Session ID as an idempotency key** so a
     retried delivery can never create a duplicate order, and
   - if all of the above pass, builds an order record and saves it via
     `netlify/functions/lib/order-store.js`, which **routes** to either
     Supabase or the dev file store (see below).

## How order storage is routed (Stage 6)

`netlify/functions/lib/order-store.js` is now a small **router**, not a
single implementation. On every save/lookup it checks whether
`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are present and look valid:

- **Configured →** delegates to `netlify/functions/lib/supabase-order-store.js`,
  which writes to the `orders` / `order_items` tables in Postgres
  (schema: `supabase/migrations/001_create_orders.sql`). This is the
  **intended production path**.
- **Not configured →** falls back to the original Stage 5 DEV/TEST-ONLY
  file store (still defined in the same file, clearly fenced off and
  labelled), and logs a developer-facing warning explaining why. This
  keeps local development possible without a Supabase project, and
  ensures **the customer-facing checkout flow never crashes** just
  because Supabase isn't configured.

Either way, `stripe-webhook.js` calls the exact same
`hasOrder` / `saveOrder` / `listOrders` functions — it has no idea which
backend is active. That seam was deliberately left open in Stage 5.

Duplicate prevention now exists at **two layers** when Supabase is active:
1. The application-level `hasOrder()` pre-check (fast path), and
2. A **database-level `unique` constraint** on `orders.stripe_session_id`
   (the real guarantee — see migration 001 and `docs/supabase-setup.md`).

## What goes into session metadata

Stripe metadata is plain string key/value pairs with strict size limits
(≤500 chars/value, ≤50 keys). `create-checkout-session.js` populates only:

- `customerFullName`, `customerEmail`, `customerPhone`
- `customerAddress1`, `customerAddress2`, `customerCity`, `customerPostcode`, `customerCountry`
- `customerNotes`
- `basketItemsJson` — a compact JSON array of `{ slug, title, qty, unitAmount }`,
  built from the **server-confirmed** `SAFE_PRODUCT_MAP`, not the frontend basket

No payment-instrument data is — or could be — included here; Stripe Checkout
never shares card numbers/CVC with the merchant in the first place.

## ⚠️ The "dev order store" is now a local-only fallback

The original Stage 5 file-based store still lives inside
`netlify/functions/lib/order-store.js` (clearly fenced off and labelled
`DEV/TEST-ONLY`). It writes one JSON file per order into
`data/dev-orders/` (gitignored — see `.gitignore` and `data/dev-orders/.gitkeep`).

As of Stage 6 it is used **only** when Supabase is not configured — i.e.
local development without `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` set.
It remains explicitly **not** suitable for production:
- Netlify's production function filesystem is read-only/ephemeral — files
  written there don't persist or survive across deploys.
- It has no real concurrency control, querying, indexing, or backup story.
- Every record is tagged `"schemaLabel": "DEV_TEST_ORDER_v1"` so nobody
  mistakes it for a production schema.

## How Supabase storage works (Stage 6)

`supabase/migrations/001_create_orders.sql` defines the production schema
(`orders`, `order_items`, `order_status_history`, with indexes, an
`updated_at` trigger, and Row Level Security enabled with **no public
policies** — see `docs/supabase-setup.md` for the full security model).

`netlify/functions/lib/supabase-client.js` builds a server-side-only
Supabase client using the **service role key** (which bypasses RLS — it
must never appear in any frontend file). `netlify/functions/lib/supabase-order-store.js`
implements the same `hasOrder` / `saveOrder` / `listOrders` convention
against Postgres, mapping the existing order shape onto table columns —
exactly the seam this document predicted back in Stage 5:

| Dev/test (file-based, fallback only)    | Supabase (Stage 6, production-intended)                                |
|------------------------------------------|------------------------------------------------------------------------|
| `hasOrder(sessionId)`                     | `select id from orders where stripe_session_id = $1`                  |
| `saveOrder(order)`                        | `insert into orders (...) ...` — relies on the `unique (stripe_session_id)` constraint to guarantee no duplicates, even under concurrent retries |
| `listOrders()` (dev/debug helper only)    | `select ... from orders order by created_at desc limit 50` (admin dashboard reads will be built properly in Stage 7) |

`netlify/functions/lib/order-store.js` is the router that decides which
of these two implementations actually runs — see "How order storage is
routed" above. `stripe-webhook.js` itself required no structural changes
beyond `await`-ing the now-asynchronous `hasOrder`/`saveOrder` calls.

## What is intentionally NOT in this stage

- No **connected/live** Supabase project — the schema and client code
  exist and have been reviewed locally, but nothing has been deployed
  or pointed at a real project with real keys
- No admin dashboard or order management UI (Stage 7)
- No outbound emails (confirmation, receipts, etc.) (Stage 8) — the
  `*_email_sent_at` columns exist in the schema but are always `null`
- No live Stripe keys anywhere
- No order fulfilment workflow — `status: 'paid'` is just a starting
  label; `order_status_history` exists for Stage 7 to use, not this stage
