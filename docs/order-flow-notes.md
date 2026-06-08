# Durga Designs — Order Flow Notes (Stage 5: Webhook + Dev/Test Order Foundation)

> **Status: TEST MODE ONLY.** Nothing in this stage is connected to live
> Stripe keys, a real database, an admin dashboard, or email. This document
> describes how the pieces fit together right now, and what changes in Stage 6.

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
   - if all of the above pass, builds a small order record and saves it via
     `netlify/functions/lib/order-store.js`.

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

## ⚠️ The "dev order store" is temporary

`netlify/functions/lib/order-store.js` is a **file-based, dev/test-only**
stand-in for a real database. It writes one JSON file per order into
`data/dev-orders/` (gitignored — see `.gitignore` and `data/dev-orders/.gitkeep`).
It exists purely so we can prove the webhook → order-creation flow end-to-end
locally, before wiring up Supabase.

It is explicitly **not** suitable for production:
- Netlify's production function filesystem is read-only/ephemeral — files
  written there don't persist or survive across deploys.
- It has no real concurrency control, querying, indexing, or backup story.
- Every record is tagged `"schemaLabel": "DEV_TEST_ORDER_v1"` so nobody
  mistakes it for a production schema.

## How this becomes Supabase in Stage 6

The webhook handler (`stripe-webhook.js`) calls exactly three functions from
`order-store.js`:

| Current (dev/test, file-based)        | Stage 6 replacement (Supabase)                                         |
|----------------------------------------|------------------------------------------------------------------------|
| `hasOrder(sessionId)`                   | `select 1 from orders where stripe_session_id = $1`                   |
| `saveOrder(order)`                      | `insert into orders (...) values (...) on conflict (stripe_session_id) do nothing` |
| `listOrders()` (dev/debug helper only)  | `select ... from orders order by created_at desc` (admin dashboard, later stage) |

The webhook handler's calling convention (`hasOrder` → `saveOrder`, keyed on
`stripe_session_id`, returning `{ created, alreadyExisted }`) is designed so
that swapping the implementation in `order-store.js` for Supabase calls should
not require changes to `stripe-webhook.js` itself — only this module's internals.

## What is intentionally NOT in this stage

- No Supabase / database connection
- No admin dashboard or order management UI
- No outbound emails (confirmation, receipts, etc.)
- No live Stripe keys anywhere
- No order fulfilment workflow — `orderStatus: 'Paid'` is just a label on a
  dev/test record, not a real operational status machine
