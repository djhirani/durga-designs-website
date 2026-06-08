# Durga Designs — Email Notification Setup Notes (Stage 8)

> **Status: NOT DEPLOYED. NO REAL EMAIL PROVIDER CONNECTED YET.**
> This document explains how the Stage 8 transactional-email layer is
> built, how to configure it for local testing, and what it deliberately
> does not do yet. Nothing in this stage has been deployed, and no real
> Resend account, API key, or recipient data exists in this repository.

## 1. What was added

Three transactional emails, sent server-side only, via a small
provider-agnostic layer:

| Email | Trigger | Sent to |
|---|---|---|
| Customer order confirmation | First time a paid order is created (Stripe webhook) | The customer's email, if present on the order |
| Admin new-order notification | Same trigger as above | `ADMIN_ORDER_EMAIL` |
| Customer dispatch / tracking | Admin sets order status to **Dispatched**, or meaningfully updates tracking details on an already-dispatched order | The customer's email, if present on the order |

None of these are wired into the public-facing site — they are only
ever triggered from server-side serverless functions
(`stripe-webhook.js`, `admin-order-update.js`, and the standalone
`send-dispatch-email.js` admin action).

## 2. The email layer's three modules

```
netlify/functions/lib/email-client.js     — talks to the provider (Resend HTTP API)
netlify/functions/lib/email-templates.js  — builds subject/html/text for each email type
netlify/functions/lib/email-service.js    — decides whether to send, builds, sends,
                                             and records the *_email_sent_at timestamp
```

Other code never calls `email-client.js` or `email-templates.js`
directly — it only ever calls the three functions exported from
`email-service.js`:　`sendCustomerConfirmation(order)`,
`sendAdminNewOrder(order)`, `sendDispatchEmail(order, opts)`. Every one
of them returns a normalised result and **never throws**:

```
{ ok: true,  sent: true,  id }
{ ok: true,  sent: false, skipped: true,  reason }   // not configured / already sent / nothing to send to
{ ok: false, sent: false, error }                     // configured, attempted, but the send failed
```

## 3. Why Resend, and why no new npm dependency

[Resend](https://resend.com) was chosen as the documented provider
because its "send email" endpoint is a single, simple authenticated
HTTP POST with a JSON body — no SDK is required to use it. So
`email-client.js` is a small wrapper around Node's built-in `https`
module rather than the `resend` npm package. This:

- keeps the project's dependency footprint exactly as it was before
  Stage 8 (per the Stage 8 brief: "do not install permanent packages
  unless necessary"),
- mirrors the lazy-require pattern already used for `stripe` and
  `@supabase/supabase-js` elsewhere in this codebase, and
- makes it trivial to swap in the official SDK, or an entirely
  different provider (Postmark, SES, SendGrid, …) later — every other
  Stage 8 module only ever calls `sendEmail()` from this one file.

If you would prefer to use the official `resend` SDK in a later stage,
that's a one-file change — nothing else needs to know.

## 4. Required environment variables

Add these to your local `.env` (copied from `.env.example` — never
commit the real `.env`):

| Variable | Used by | Notes |
|---|---|---|
| `RESEND_API_KEY` | `email-client.js` | **Server-side only.** Get a test key from Resend's dashboard (`re_...`). Never put this in any frontend file. |
| `FROM_EMAIL` | `email-client.js` | A sender identity you've **verified** with Resend, e.g. `Durga Designs <orders@yourdomain.example>`. Unverified senders are rejected by the provider, not by this code. |
| `ADMIN_ORDER_EMAIL` | `email-service.js` | The inbox that receives "new paid order" notifications — should be a real Durga Designs staff inbox once you're genuinely testing. |
| `SITE_URL` | `email-service.js` (admin email only) | Already used elsewhere (Stage 5+); reused here to build a clickable admin-dashboard link in the admin notification email. |

If `RESEND_API_KEY` or `FROM_EMAIL` is missing or looks like a
placeholder, `email-client.js` returns `{ ok: true, sent: false,
skipped: true, reason: '...' }` and logs a clear developer message —
**it never throws, and nothing downstream breaks**. If
`ADMIN_ORDER_EMAIL` is missing, `sendAdminNewOrder()` skips in the same
way. This is exactly the same fail-safe philosophy as the
Supabase/dev-store fallback from Stage 6.

## 5. How duplicate prevention works

Three columns already existed in the `orders` table from the Stage 6
migration, created specifically for this purpose:
`confirmation_email_sent_at`, `admin_email_sent_at`,
`dispatch_email_sent_at`.

**The rule is always: send first, then record — never the other way
round.** `email-service.js`:

1. Checks the relevant `*_email_sent_at` value via
   `order-store.getOrderEmailStatus(stripeSessionId)` (which itself
   routes to Supabase or the dev fallback, exactly like every other
   order-store call in this project).
2. If it's already set (and, for dispatch emails, the caller hasn't
   flagged a meaningful tracking change — see below), the send is
   skipped with `{ skipped: true, reason: 'already-sent' }`.
3. Only once `email-client.sendEmail()` reports a genuine success does
   it call `order-store.markOrderEmailSent(stripeSessionId, field)` to
   stamp the timestamp.

This guarantees a failed send never gets falsely marked as sent, and a
successful send is never repeated just because something else (e.g. a
Stripe webhook retry, or an unrelated admin save) re-ran the same code
path.

**Layer 1 — structural guard (webhook):** `stripe-webhook.js` only ever
calls the confirmation/admin-notification senders when
`saveOrder()` reports `result.created === true` — i.e. genuinely the
first time this Stripe Checkout Session ID has produced an order.
Retried deliveries are caught earlier by `hasOrder()` / `alreadyExisted`
and never reach the email-sending code at all.

**Layer 2 — persisted guard (both):** `email-service.js` re-checks the
`*_email_sent_at` column regardless, so even a future code path that
calls these functions outside the webhook's guard can't double-send.

**Dispatch email "meaningful change" rule:** `admin-order-update.js`
computes two booleans from the before/after state returned by
`lib/admin-order-data.js` (`previousStatus`, `previousTrackingNumber`):

- `justDispatched` — the status just changed *to* "Dispatched", or
- `trackingMeaningfullyChanged` — the order is (or just became)
  "Dispatched" **and** the admin supplied a non-empty tracking number
  that differs from what was stored before this save.

A dispatch email is only attempted when at least one of those is true.
When `dispatchEmailSentAt` is already set, `email-service.js` will only
proceed with a resend if `trackingMeaningfullyChanged` was passed
through — a routine re-save with the same tracking number, or any
unrelated field change (courier text tweak, admin notes, etc.), never
triggers a resend.

**Manual resend:** `netlify/functions/send-dispatch-email.js` is a
small, separately admin-gated endpoint that lets a human explicitly
(re)send the dispatch email for an order whose status is already
"Dispatched" — useful if the automatic send failed, or details were
corrected. An explicit admin action always counts as "meaningful" by
definition; the underlying duplicate-prevention/timestamp-recording
logic in `email-service.js` is exactly the same either way.

## 6. Dev/test file-store fallback — limitations

When Supabase isn't configured, `order-store.js` already falls back to
a flat-file dev order store (Stage 5/6). Stage 8 extends that fallback
with `devGetOrderEmailStatus()` / `devMarkOrderEmailSent()`, which add
three optional camelCase properties to the same per-order JSON file
(`confirmationEmailSentAt`, `adminEmailSentAt`, `dispatchEmailSentAt`).

This is a simple read-modify-write over a flat file with **no locking
or concurrency control** — adequate for solo local testing (the only
thing this fallback is for), but, exactly like the rest of the dev
store, it must never be relied on for real orders or in any environment
handling genuine customer data. See `docs/order-flow-notes.md` for the
broader dev-store caveats, which apply identically here.

## 7. Security & content rules (enforced in code)

- `RESEND_API_KEY` is read only inside `email-client.js`, only from
  `process.env`, and is never logged, returned, or referenced from any
  frontend-servable file. It is exactly as sensitive as
  `STRIPE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY`.
- All user/customer-supplied content that reaches a template (names,
  addresses, notes, product titles, courier/tracking strings) is passed
  through `escapeHtml()` in `email-templates.js` before being placed
  into HTML output.
- No template references card numbers, CVC, or any other
  payment-instrument data, and none ever could — the order shapes these
  templates receive never contain such data in the first place (Stripe
  Checkout handles and stores it, never Durga Designs). Every email
  explicitly states that payments are processed securely by Stripe.
- No template mentions bank account details, sort codes, or any
  equivalent — Durga Designs does not take payments that way, and these
  templates don't introduce the concept.

## 8. What this stage deliberately does not do

- No real Resend account, domain, or API key exists anywhere in this
  repository — only documented placeholders in `.env.example`.
- No real emails have been sent during development of this stage —
  every local test ran with `RESEND_API_KEY` either unset or pointed at
  a mocked client, by design (see the Stage 8 report's "local test
  results" for exactly what was verified and how).
- No marketing emails, newsletters, password resets, or any
  non-transactional message type — strictly the three order-lifecycle
  emails described above.
- No outbound webhook/email retries or queueing system — a failed send
  is logged and surfaced in the relevant function's response (where
  applicable), but is not automatically retried. That is a reasonable
  candidate for a later stage once a real provider is connected.

## 9. Deployment status

**Nothing in this stage is deployed.** No Netlify/Vercel deploy, no
push to a remote repository, and no live Resend account has been
created or connected. When you're ready to go live, you will need to:
verify a sending domain with Resend, generate a real API key, and add
real environment variables to your Netlify site configuration (never to
a committed file).
