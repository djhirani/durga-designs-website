-- ================================================================
-- DURGA DESIGNS — SUPABASE MIGRATION 001: Orders schema (Stage 6)
-- ================================================================
-- Status: NOT DEPLOYED. This file is reviewed/local-only at this stage.
-- Run it manually in the Supabase SQL editor (or via `supabase db push`
-- once you have a real project) — see docs/supabase-setup.md.
--
-- This migration creates the production order-storage schema that the
-- Stripe webhook (netlify/functions/stripe-webhook.js) will write to via
-- netlify/functions/lib/supabase-order-store.js, ONLY after Stripe has
-- confirmed a `checkout.session.completed` event with payment_status
-- = 'paid'. No frontend code talks to these tables directly.
--
-- Currency: GBP only at this stage. Amounts are stored as numeric(10,2)
-- decimal pounds (e.g. 24.50), matching the shape already used by the
-- Stage 5 dev/test order records (totalAmount as a decimal, not pence).
-- ================================================================

-- ----------------------------------------------------------------
-- Table: orders
-- One row per successfully paid Stripe Checkout Session.
-- ----------------------------------------------------------------
create table if not exists public.orders (
  id                          uuid primary key default gen_random_uuid(),

  -- Human-friendly reference shown to customers/admin (e.g. DD-TEST-...).
  order_number                text not null,

  -- ── Stripe references (idempotency + audit trail) ──────────────
  -- stripe_session_id is THE idempotency key: Stripe may retry webhook
  -- delivery, and this unique constraint guarantees we can never insert
  -- a duplicate order for the same Checkout Session.
  stripe_session_id           text not null,
  stripe_payment_intent_id    text,
  stripe_event_id             text,

  -- ── Customer / delivery details ─────────────────────────────────
  -- Sourced only from Stripe-confirmed session data / sanitised
  -- checkout-session metadata — never raw, untrusted frontend input.
  -- Never contains card numbers, CVC, or other payment-instrument data.
  customer_name               text,
  customer_email              text,
  customer_phone              text,
  address_line1               text,
  address_line2               text,
  city                        text,
  postcode                    text,
  country                     text,

  -- ── Totals (GBP decimal pounds, e.g. 24.50) ─────────────────────
  subtotal_amount             numeric(10,2),
  delivery_amount             numeric(10,2),
  total_amount                numeric(10,2) not null,
  currency                    text not null default 'gbp',

  -- ── Order / fulfilment status ───────────────────────────────────
  -- 'status' is the primary admin-facing status (Stage 7 will manage
  -- this via an admin dashboard). payment_status mirrors what Stripe
  -- told us at the time the order was created.
  payment_status              text not null default 'paid',
  status                      text not null default 'paid',

  -- ── Admin / fulfilment fields (Stage 7) ─────────────────────────
  courier                     text,
  tracking_number             text,
  admin_notes                 text,

  -- ── Email tracking columns (Stage 8) ────────────────────────────
  -- Populated only once the relevant email has actually been sent.
  -- Left null at this stage — no email service exists yet.
  confirmation_email_sent_at  timestamptz,
  admin_email_sent_at         timestamptz,
  dispatch_email_sent_at      timestamptz,

  -- ── Timestamps ──────────────────────────────────────────────────
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  -- Idempotency guarantee at the database level: a retried webhook
  -- delivery for the same Checkout Session can never create a second row.
  constraint orders_stripe_session_id_key unique (stripe_session_id)
);

comment on table public.orders is
  'Durga Designs paid orders (Stage 6). Written ONLY by server-side Stripe webhook code after a confirmed checkout.session.completed + payment_status = paid. Never written to directly by frontend code.';

comment on column public.orders.stripe_session_id is
  'Stripe Checkout Session ID — unique idempotency key. Prevents duplicate orders if Stripe retries the webhook.';

comment on column public.orders.status is
  'Admin-facing fulfilment status (e.g. paid, processing, dispatched, completed, cancelled). Managed via the admin dashboard arriving in Stage 7.';

comment on column public.orders.confirmation_email_sent_at is
  'Set only once a customer confirmation email has actually been sent. Email service arrives in Stage 8 — left null until then.';

-- ----------------------------------------------------------------
-- Table: order_items
-- One row per basket line item belonging to an order.
-- Server-confirmed slug/title/qty/unit price only — never trusts
-- frontend-supplied prices (mirrors SAFE_PRODUCT_MAP validation in
-- netlify/functions/create-checkout-session.js).
-- ----------------------------------------------------------------
create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),

  order_id      uuid not null references public.orders (id) on delete cascade,

  product_slug  text not null,
  title         text not null,
  quantity      integer not null check (quantity > 0),

  -- Server-confirmed unit price in GBP decimal pounds (e.g. 24.50).
  unit_amount   numeric(10,2) not null,
  currency      text not null default 'gbp',

  created_at    timestamptz not null default now()
);

comment on table public.order_items is
  'Line items belonging to a Durga Designs order (Stage 6). product_slug/title/unit_amount are server-confirmed values from SAFE_PRODUCT_MAP at checkout time — never trusted frontend input.';

-- ----------------------------------------------------------------
-- Table: order_status_history
-- Optional but useful audit trail of status transitions, ready for
-- the admin dashboard (Stage 7) to read from and write to.
-- ----------------------------------------------------------------
create table if not exists public.order_status_history (
  id          uuid primary key default gen_random_uuid(),

  order_id    uuid not null references public.orders (id) on delete cascade,

  from_status text,
  to_status   text not null,

  -- Free-text note about why the status changed (admin-entered, Stage 7).
  note        text,

  changed_at  timestamptz not null default now()
);

comment on table public.order_status_history is
  'Audit trail of order status changes (Stage 6 schema, populated by the admin dashboard in Stage 7). Not written to by the Stripe webhook beyond the implicit initial "paid" status on the orders row itself.';

-- ----------------------------------------------------------------
-- Indexes for admin lookup / common queries
-- ----------------------------------------------------------------
create index if not exists orders_created_at_idx     on public.orders (created_at desc);
create index if not exists orders_status_idx         on public.orders (status);
create index if not exists orders_customer_email_idx on public.orders (customer_email);
create index if not exists orders_stripe_session_id_idx on public.orders (stripe_session_id);

create index if not exists order_items_order_id_idx  on public.order_items (order_id);
create index if not exists order_status_history_order_id_idx on public.order_status_history (order_id);

-- ----------------------------------------------------------------
-- updated_at maintenance trigger for orders
-- ----------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row
  execute function public.set_updated_at();

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
-- Orders contain personal customer data (name, email, phone, address)
-- and must NEVER be readable or writable by anonymous/public clients.
--
-- We enable RLS on every table here and intentionally create NO POLICIES
-- at all. With RLS enabled and zero policies, PostgREST/Supabase's
-- anon and authenticated roles get ZERO access — every request is denied
-- by default. The ONLY way to read or write these tables is via the
-- Supabase **service role key**, which bypasses RLS and is used
-- exclusively by server-side Netlify functions
-- (see netlify/functions/lib/supabase-client.js). That key must never
-- be present in any frontend file — see docs/supabase-setup.md.
--
-- Stage 7 (admin dashboard) will introduce its own server-side,
-- authenticated access path — NOT public RLS read policies on these
-- tables — when it is built.
-- ================================================================

alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.order_status_history enable row level security;

-- Deliberately no `create policy ...` statements below this line.
-- No public read policy. No public write policy. No anon access at all.
