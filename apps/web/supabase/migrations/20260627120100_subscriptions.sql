-- subscriptions: paid Pro subscriptions via Razorpay.
-- Insert path: create-razorpay-order edge fn (status='pending').
-- Update path: verify-razorpay-payment edge fn (status='active' after signature check).
-- Read path:   paymentService.getCurrentSubscription() on web + mobile via @drut/shared.
-- Pricing: ₹199/month (19900 paise) · ₹1999/year (199900 paise), ₹1799 first-timer
--          intro on annual (179900 paise). Amount is re-derived server-side in the
--          create-razorpay-order edge fn from @drut/shared pricing.ts — never trusted
--          from the client.

create table if not exists public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,

  -- Plan + status
  plan                      text not null check (plan in ('monthly','annual')),
  status                    text not null
                              check (status in ('pending','active','past_due','canceled','expired')),

  -- Razorpay identifiers
  razorpay_order_id         text,                       -- order_<id>; set on order creation
  razorpay_payment_id       text,                       -- pay_<id>;   set after signature verify
  razorpay_subscription_id  text,                       -- sub_<id>;   only for recurring autodebit (not used in v1)
  razorpay_signature        text,                       -- audit: signature we successfully verified

  -- Amount in paise (₹199 = 19900, ₹1999 = 199900, ₹1799 first-timer = 179900) for audit + reconciliation.
  amount_paise              integer not null check (amount_paise > 0),
  currency                  text    not null default 'INR',

  -- Period
  started_at                timestamptz not null default now(),
  expires_at                timestamptz not null,
  canceled_at               timestamptz,

  -- Audit
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- One ACTIVE subscription per user. Lets the paywall query "is user pro" with a single row.
create unique index if not exists subscriptions_one_active_per_user
  on public.subscriptions(user_id)
  where status = 'active';

create index if not exists subscriptions_user_id_idx       on public.subscriptions(user_id);
create index if not exists subscriptions_status_idx        on public.subscriptions(status);
create index if not exists subscriptions_expires_at_idx    on public.subscriptions(expires_at);
create index if not exists subscriptions_razorpay_order_idx on public.subscriptions(razorpay_order_id) where razorpay_order_id is not null;

-- Auto-touch updated_at
create or replace function public.tg_subscriptions_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.tg_subscriptions_touch_updated_at();

alter table public.subscriptions enable row level security;

-- Users see their own subscription row only.
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Writes are ONLY allowed via service role (edge fns). No insert/update policy
-- for authenticated role means the API path is the only writer — exactly what
-- we want for payment state. Admin reads/writes via JWT role check.
drop policy if exists "subscriptions_admin_all" on public.subscriptions;
create policy "subscriptions_admin_all"
  on public.subscriptions for all
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );

-- payment_events: audit trail of every Razorpay event (verify + future webhook events).
-- Lets us reconstruct what happened if a subscription row looks wrong.
create table if not exists public.payment_events (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete set null,
  razorpay_event_type text not null,                   -- e.g. 'payment.verified', 'payment.captured', 'refund.created'
  razorpay_order_id   text,
  razorpay_payment_id text,
  signature_verified  boolean not null default false,
  raw_payload         jsonb not null,
  processed           boolean not null default false,
  error               text,
  received_at         timestamptz not null default now()
);

create index if not exists payment_events_received_at_idx on public.payment_events(received_at desc);
create index if not exists payment_events_order_id_idx    on public.payment_events(razorpay_order_id) where razorpay_order_id is not null;

alter table public.payment_events enable row level security;
-- Service role only. No public policies = no client-side access.

comment on table  public.subscriptions  is 'Pro subscriptions via Razorpay. Writes only via create-razorpay-order + verify-razorpay-payment edge fns (service role).';
comment on table  public.payment_events is 'Audit log of every Razorpay verification + webhook event. Service-role-only access.';
