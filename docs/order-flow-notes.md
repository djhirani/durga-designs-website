# Durga Designs — Order Flow Notes (Stages 5–8: Webhook, Storage, Admin & Email)

> **Status: TEST MODE ONLY. NOT DEPLOYED.** Nothing here is connected to
> live Stripe keys, a real/connected Supabase project, or a real email
> provider account. This document describes how the pieces fit together
> right now.
>
> **Stage 6 update:** Supabase Postgres storage code has now been added
> (see `supabase/migrations/001_create_orders.sql`,
> `netlify/functions/lib/supabase-client.js`, and
> `netlify/functions/lib/supabase-order-store.js`) and is the *intended
> production* order store. The Stage 5 dev file store still exists as a
> local-only fallback — see "How order storage is routed" below.
>
> **Stage 7 update:** A protected admin order dashboard now exists
> (`admin/index.html`, `admin/orders/index.html`, `admin/order.html`,
> `js/admin-orders.js`, `netlify/functions/admin-orders.js`,
> `netlify/functions/admin-order-update.js`,
> `netlify/functions/lib/admin-auth.js`,
> `netlify/functions/lib/admin-order-data.js`) — see "Admin order dashboard
> (Stage 7)" below. It is gated by a temporary shared `ADMIN_ACCESS_TOKEN`
> and reads/writes orders only through Durga Designs' own server-side
> functions; it never talks to Supabase directly from the browser.
>
> **Stage 8 update:** Transactional order emails now exist — customer
> order confirmation, admin new-order notification, and customer
> dispatch/tracking (`netlify/functions/lib/email-client.js`,
> `email-templates.js`, `email-service.js`,
> `netlify/functions/send-dispatch-email.js`) — see "Order email
> notifications (Stage 8)" below and `docs/email-setup.md` for full
> details. They are sent server-side only, via Resend, with strict
> duplicate prevention backed by the `*_email_sent_at` columns added in
> the Stage 6 migration.

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

## Admin order dashboard (Stage 7)

Durga Designs staff can now view and update paid orders through a
small, protected admin tool:

- **`admin/index.html`** — landing page where the admin pastes their
  `ADMIN_ACCESS_TOKEN` (a temporary shared-secret gate — see below).
- **`admin/orders/index.html`** — order list (number, date, customer
  name/email, total, payment status, order status), newest first.
- **`admin/order.html?id=...`** — full order detail (Stripe session ID,
  customer + delivery details, items/quantities/prices, totals, payment
  status) plus an update form for **status, courier, tracking number,
  and admin notes**, and a status-change history log.

**How access is gated (temporary, by design):**
`ADMIN_ACCESS_TOKEN` is a single shared secret, set as a server-side
environment variable only (see `.env.example`). The admin pastes it
into the browser; it's kept only in `sessionStorage` for that tab
(cleared when the tab closes — never written to a file, never logged)
and sent as an `X-Admin-Token` request header. Every admin Netlify
Function verifies it via `netlify/functions/lib/admin-auth.js` —
constant-time comparison, missing token → 401, wrong token → 403,
not configured → 503 — **before** touching any order data. This is
explicitly a stop-gap; a real authentication system can replace it
later without changing how the rest of the admin code calls
`requireAdmin(event)`.

**How reads/writes stay safe:**
The admin frontend (`js/admin-orders.js`) **never** talks to Supabase —
it only calls `netlify/functions/admin-orders.js` (list + detail) and
`netlify/functions/admin-order-update.js` (updates), which route through
`netlify/functions/lib/admin-order-data.js`. That module picks Supabase
or the dev/test file-store fallback exactly like the Stage 6 webhook
router, and returns a normalised shape either way. Updates go through a
strict allow-list (`status`, `courier`, `trackingNumber`, `adminNotes`,
`statusNote`) — `status` is validated against a fixed list (`Paid`,
`Packing`, `Dispatched`, `Delivered`, `Cancelled`, `Refunded`), every
other field is silently dropped, and a status change is recorded as a
history entry (Supabase: `order_status_history` row; dev fallback: an
in-file `statusHistory` array).

**What the dashboard deliberately does not do:** expose any order data
publicly, or let the browser reach Supabase or the database directly.
(As of Stage 8, it *does* trigger one email — see below.)

## Order email notifications (Stage 8)

Three transactional emails are now sent, server-side only, through a
small provider-agnostic layer — full detail lives in
`docs/email-setup.md`, summarised here:

- **Customer order confirmation** — sent to the customer's email the
  first time a paid order is created (triggered from
  `stripe-webhook.js`, immediately after `saveOrder()` reports
  `result.created === true`). Confirms the order number, items,
  total paid, and delivery address; explicitly says Durga Designs will
  now prepare the order — it does **not** claim dispatch yet.
- **Admin new-order notification** — sent to `ADMIN_ORDER_EMAIL` at the
  same trigger point, with full order/customer/contact/delivery details
  and a link to the (locally-running, not-yet-deployed) admin dashboard.
- **Customer dispatch / tracking** — sent to the customer's email when
  an admin update (`admin-order-update.js`) moves the order's status to
  **Dispatched**, or meaningfully changes the tracking number on an
  already-dispatched order. States courier and tracking number (if
  available) and a short support message — no delivery-date promises.

**The pieces:**
`netlify/functions/lib/email-client.js` is a small `https`-based wrapper
around the [Resend](https://resend.com) HTTP send-email API (no new npm
dependency — see `docs/email-setup.md` §3 for why). It reads
`RESEND_API_KEY` / `FROM_EMAIL` from the server-side environment only,
and fails safely (`{ skipped: true, reason }`) if either is missing or
looks like a placeholder. `netlify/functions/lib/email-templates.js`
builds the subject/HTML/text for each email — every piece of
user-supplied content (names, addresses, notes, item titles, courier/
tracking strings) is passed through `escapeHtml()` before reaching HTML
output, and no template ever references card, CVC, PAN, or bank-account
details (the order shapes they receive never contain such data — Stripe
Checkout handles and stores it, never Durga Designs).
`netlify/functions/lib/email-service.js` is the only module other code
calls — it owns the decision of *whether* to send, builds via templates,
sends via the client, and (only on a genuinely successful send) records
the matching `*_email_sent_at` timestamp via `order-store`'s new
`getOrderEmailStatus()` / `markOrderEmailSent()` helpers (which route to
Supabase or the dev fallback, exactly like every other order-store call).

**Duplicate prevention (see `docs/email-setup.md` §5 for full detail):**
the webhook only ever calls the confirmation/admin senders on a
genuinely first-time `saveOrder()` (retries are already caught by
`hasOrder()`/`alreadyExisted` upstream — emails never even get
considered for a replay), and `email-service.js` re-checks the
persisted `*_email_sent_at` column regardless, as a second layer of
defence. Dispatch emails additionally compare the before/after state
(`previousStatus`, `previousTrackingNumber` — now returned by
`lib/admin-order-data.js`'s `updateOrder()`) so a routine re-save that
doesn't change status or tracking never re-sends. A small standalone,
admin-gated endpoint (`netlify/functions/send-dispatch-email.js`) lets a
human explicitly (re)send the dispatch email for an already-dispatched
order — e.g. if the automatic send failed.

**What this deliberately doesn't do:** send any non-transactional email
(marketing, newsletters, password resets, …), retry/queue failed sends,
or let any email-sending failure block order creation or an admin
update — every send is wrapped so a notification problem can never
become an order problem.

## What is intentionally NOT in this stage

- No **connected/live** Supabase project — the schema and client code
  exist and have been reviewed locally, but nothing has been deployed
  or pointed at a real project with real keys
- No **connected/live** Resend account, domain, or API key — only
  documented placeholders exist in `.env.example` (see
  `docs/email-setup.md`)
- No live Stripe keys anywhere
- No real authentication system for the admin dashboard — `ADMIN_ACCESS_TOKEN`
  is a deliberate, documented stop-gap (see "Admin order dashboard" above)
- No legal-page changes
- No marketing/non-transactional email of any kind
