# Durga Designs — Supabase Setup Notes (Stage 6)

> **Status: NOT DEPLOYED. NOT CONNECTED TO A REAL PROJECT YET.**
> This document explains how to set up Supabase for local development
> and eventual production use. Nothing in this stage has been deployed,
> and no real Supabase project, keys, or data exist in this repository.

## 1. How to create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **New project**, choose an organisation, give it a name
   (e.g. `durga-designs`), set a strong database password, and pick a
   region close to your customers (e.g. `eu-west-2` / London).
3. Wait for the project to finish provisioning — Supabase gives you a
   Postgres database plus auto-generated REST/Realtime APIs on top of it.
4. From **Project Settings → API**, note down:
   - **Project URL** → `SUPABASE_URL`
   - **anon / public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secret — see security notes below)

## 2. Where to run the SQL migration

The schema for this stage lives in:

```
supabase/migrations/001_create_orders.sql
```

To apply it:

- **Easiest (manual):** open your Supabase project → **SQL Editor** →
  paste the entire contents of `001_create_orders.sql` → **Run**.
- **CLI (optional, for later stages):** if you install the
  [Supabase CLI](https://supabase.com/docs/guides/cli) and link it to
  your project, you can run `supabase db push` to apply migrations from
  the `supabase/migrations/` folder in order. This repo does not assume
  the CLI is installed — the manual route above is sufficient for now.

Either way, **review the SQL before running it** — it creates three
tables (`orders`, `order_items`, `order_status_history`), indexes,
an `updated_at` trigger, and enables Row Level Security with
**no public policies** (see Section 4).

## 3. Required environment variables

Add these to your local `.env` (copied from `.env.example` — never commit
the real `.env`):

| Variable | Where it's used | Notes |
|---|---|---|
| `SUPABASE_URL` | `netlify/functions/lib/supabase-client.js` | Project URL, e.g. `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | *(placeholder only — not currently used)* | Kept for completeness; this project's frontend does **not** call Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `netlify/functions/lib/supabase-client.js` | **Server-side only.** Bypasses RLS — treat like a DB root password |
| `ADMIN_ACCESS_TOKEN` | `netlify/functions/lib/admin-auth.js` | **Server-side only.** Temporary shared-token gate for the admin dashboard (Stage 7) — generate a long random string, never commit a real value |
| `RESEND_API_KEY` | `netlify/functions/lib/email-client.js` | **Server-side only.** Transactional-email provider key (Stage 8) — see `docs/email-setup.md`, never commit a real value |
| `FROM_EMAIL` | `netlify/functions/lib/email-client.js` | Verified sender identity, e.g. `Durga Designs <orders@yourdomain.example>` (Stage 8) |
| `ADMIN_ORDER_EMAIL` | `netlify/functions/lib/email-service.js` | Inbox that receives "new paid order" notifications (Stage 8) |

If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` are missing or don't
look valid, `netlify/functions/lib/order-store.js` automatically falls
back to the DEV/TEST-ONLY local file order store from Stage 5 and logs
a clear developer-facing warning. **The customer-facing checkout flow
never crashes because Supabase isn't configured.**

## 4. RLS / security model

- **Row Level Security (RLS) is enabled** on `orders`, `order_items`,
  and `order_status_history` (see the bottom of `001_create_orders.sql`).
- **No policies are created.** With RLS on and zero policies, Supabase's
  `anon` and `authenticated` roles get **zero** access — every request
  from the public API is denied by default. There is no public read
  policy, and there never should be one for raw order data.
- The **only** way to read or write these tables is via the
  **service role key**, which intentionally bypasses RLS. That key:
  - lives only in the Netlify function environment (server-side),
  - is read only by `netlify/functions/lib/supabase-client.js`,
  - is never imported by, referenced from, or bundled into any
    frontend-servable file (HTML, browser JS, `js/config.js`, etc.),
  - must never be committed to the repository (only the placeholder
    name appears in `.env.example`).
- The **frontend never talks to Supabase directly** for orders — it
  never has, and this stage doesn't change that. All order writes
  happen exclusively inside the Stripe webhook handler
  (`netlify/functions/stripe-webhook.js`), server-side, strictly after
  Stripe confirms a `checkout.session.completed` event with
  `payment_status: 'paid'`.
- **Idempotency is enforced at the database level** via a `unique`
  constraint on `orders.stripe_session_id` — a retried webhook delivery
  can never produce a duplicate row, regardless of any application-level
  check (those exist too, as a fast-path, but the constraint is the
  real guarantee).

## 5. Admin dashboard (Stage 7)

A protected admin dashboard now exists at `admin/index.html` →
`admin/orders/index.html` → `admin/order.html?id=...`. It uses a
**temporary shared-token gate** (`ADMIN_ACCESS_TOKEN`, see
`.env.example`) rather than real user accounts — that's intentionally
a stop-gap, documented as such everywhere it appears.

How it stays safe:
- The admin frontend **never** talks to Supabase directly. It only
  calls Durga Designs' own Netlify Functions
  (`netlify/functions/admin-orders.js` and
  `netlify/functions/admin-order-update.js`), which verify the token
  via `netlify/functions/lib/admin-auth.js` on every single request
  before touching any data.
- Those functions read/write through
  `netlify/functions/lib/admin-order-data.js`, which itself routes to
  Supabase (when configured) or the dev/test file-store fallback —
  exactly the same pattern as the Stage 6 webhook order-store router.
- `ADMIN_ACCESS_TOKEN` is a server-side-only environment variable.
  The browser never stores it persistently (sessionStorage only —
  cleared when the tab closes) and it is sent only as a request
  header to Durga Designs' own functions.
- The `status`, `courier`, `tracking_number`, `admin_notes`, and
  `order_status_history` pieces of the schema — added in Stage 6
  specifically so this stage would have somewhere to read from and
  write to — are now actively used by the dashboard's update form.

## 6. Email notifications (Stage 8)

The `confirmation_email_sent_at`, `admin_email_sent_at`, and
`dispatch_email_sent_at` columns are now actively used. A small,
provider-agnostic email layer (`netlify/functions/lib/email-client.js`,
`email-templates.js`, `email-service.js` — see `docs/email-setup.md`
for the full picture) sends three transactional emails — customer order
confirmation, admin new-order notification, and customer dispatch/
tracking — and stamps the matching column with the current timestamp
**only after a genuinely successful send**, which is what prevents
duplicate sends on webhook replays or repeated admin saves.

If `RESEND_API_KEY` / `FROM_EMAIL` / `ADMIN_ORDER_EMAIL` are not
configured, the email layer no-ops safely with a clear developer-facing
log message — exactly like the Supabase/dev-store fallback pattern.
**No order/admin/dispatch flow can ever fail or be blocked because
email sending isn't configured.**

## 7. Deployment status

**Nothing in this stage is deployed.** No Netlify/Vercel deploy, no
push to a remote repository, and no live Supabase project has been
created or connected as part of this work — this document and the
accompanying code are provided for local review and future setup only.
When you're ready to go live, you will need to: create a real Supabase
project, run the migration there, and add real environment variables
to your Netlify site configuration (never to a committed file).
