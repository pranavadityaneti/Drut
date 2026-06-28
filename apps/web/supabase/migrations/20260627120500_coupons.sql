-- coupons + coupon_redemptions: discount codes for Pro subscriptions.
--
-- Apply path: create-razorpay-order edge fn validates a coupon_code server-side
-- and computes the discounted amount. If the discount makes it ₹0 (e.g. a 100%
-- test code), it grants the subscription directly (bypassing Razorpay, which
-- rejects sub-₹1 orders); otherwise it creates a Razorpay order for the
-- discounted amount and links the coupon to the pending subscription so
-- verify-razorpay-payment records the redemption on success.
--
-- Codes are stored UPPERCASE and matched case-insensitively (app-side).
-- All reads/writes go through service-role edge fns (validate-coupon,
-- admin-coupons, create/verify) — no client RLS policies, so codes can't be
-- enumerated and discounts can't be tampered with from the browser.

create table if not exists public.coupons (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,                 -- stored UPPERCASE
  type             text not null check (type in ('percent','flat')),
  value            integer not null check (value >= 0),  -- percent: 0..100 ; flat: paise off
  applies_to_plan  text not null default 'any' check (applies_to_plan in ('any','monthly','annual')),
  max_redemptions  integer check (max_redemptions is null or max_redemptions >= 0),  -- null = unlimited
  times_redeemed   integer not null default 0 check (times_redeemed >= 0),
  per_user_limit   integer not null default 1 check (per_user_limit >= 1),
  expires_at       timestamptz,                          -- null = no expiry
  active           boolean not null default true,
  note             text,                                 -- admin label
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- A percent coupon can't exceed 100.
alter table public.coupons drop constraint if exists coupons_percent_max;
alter table public.coupons add constraint coupons_percent_max
  check (type <> 'percent' or value <= 100);

create index if not exists coupons_active_idx on public.coupons(active) where active;

alter table public.coupons enable row level security;
-- Service-role only (no public policies): codes are never enumerable client-side.

-- One row per successful redemption — enforces max_redemptions + per_user_limit.
create table if not exists public.coupon_redemptions (
  id               uuid primary key default gen_random_uuid(),
  coupon_id        uuid not null references public.coupons(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  subscription_id  uuid references public.subscriptions(id) on delete set null,
  redeemed_at      timestamptz not null default now()
);

create index if not exists coupon_redemptions_coupon_idx on public.coupon_redemptions(coupon_id);
create index if not exists coupon_redemptions_user_idx   on public.coupon_redemptions(user_id);

alter table public.coupon_redemptions enable row level security;
-- Service-role only.

-- Link a subscription to the coupon used, so verify-razorpay-payment can record
-- the redemption only AFTER a successful paid checkout.
alter table public.subscriptions add column if not exists coupon_id uuid references public.coupons(id) on delete set null;

-- Reuse the touch-updated_at trigger fn from the subscriptions migration.
drop trigger if exists coupons_touch_updated_at on public.coupons;
create trigger coupons_touch_updated_at
  before update on public.coupons
  for each row execute function public.tg_subscriptions_touch_updated_at();

-- Seed one internal end-to-end TEST code: 100% off, reusable, so the team can
-- exercise the full upgrade flow without paying. Safe to delete later.
insert into public.coupons (code, type, value, applies_to_plan, per_user_limit, max_redemptions, note)
values ('DRUTTEST100', 'percent', 100, 'any', 999, null, 'Internal end-to-end test (100% off) — delete before public launch')
on conflict (code) do nothing;

comment on table public.coupons is 'Discount codes for Pro. Server-validated; 100%-off bypasses Razorpay and grants directly. Codes stored UPPERCASE.';
comment on table public.coupon_redemptions is 'One row per successful coupon use; enforces max_redemptions + per_user_limit.';
