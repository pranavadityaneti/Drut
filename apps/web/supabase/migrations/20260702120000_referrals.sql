-- referrals: symmetric 1-month-free referral program.
--
-- WHAT: When a referred user's YEARLY subscription goes 'active', both the
-- referrer and the referred user get 30 extra days of Pro added to their
-- subscription.expires_at. One-time per referred user, atomic, idempotent.
--
-- WHY yearly-only + why symmetric: locked with Pranav 2026-07-02.
--   - Higher-bar conversion (yearly = ₹1799+) so reward economics work.
--   - Symmetric reward means the friend has a real reason to use the invite
--     link over signing up directly (weakest referral programs give only the
--     referrer a benefit).
--   - Free users can refer: they get a comp Pro month (matches existing comp
--     pattern from 20260627120300_allow_comp_subscriptions).
--
-- WHERE this plugs in: verify-razorpay-payment edge fn (after the sub flips
-- 'active') will call public.apply_referral_reward(referred_user_id, sub_id).
-- The DB is agnostic to product rules — yearly-only enforcement lives in the
-- edge fn so business rules can change without a migration.
--
-- IDEMPOTENCY: enforced via UNIQUE(referred_user_id) on public.referral_rewards
-- + transaction-abort on race (unique_violation → raise). No double-reward
-- even under concurrent verifies for the same subscription.

-- ============================================================================
-- Table 1: user_referrals
-- ----------------------------------------------------------------------------
-- Stores each user's OWN shareable referral code + who referred them (if any).
-- One row per user, keyed on auth.users(id). Populated by:
--   (a) a signup trigger (change #2 in the referrals plan) — auto-generates
--       the user's own referral_code on new user creation.
--   (b) the signup attribution flow (change #4) — sets referred_by_code +
--       referred_by_user_id if the new user came via an /r/<code> link.
-- ============================================================================
create table if not exists public.user_referrals (
  user_id              uuid        primary key references auth.users(id) on delete cascade,
  referral_code        text        not null unique,
  referred_by_code     text,                                                        -- code the user signed up with (raw string kept for audit even if referrer is later deleted)
  referred_by_user_id  uuid        references auth.users(id) on delete set null,   -- resolved referrer at attribution time
  created_at           timestamptz not null default now()
);

create index if not exists user_referrals_referred_by_code_idx
  on public.user_referrals(referred_by_code)
  where referred_by_code is not null;

create index if not exists user_referrals_referred_by_user_id_idx
  on public.user_referrals(referred_by_user_id)
  where referred_by_user_id is not null;

alter table public.user_referrals enable row level security;

-- User can see their own row (needed by the mobile modal to display their code)
drop policy if exists "user_referrals_select_own" on public.user_referrals;
create policy "user_referrals_select_own"
  on public.user_referrals for select
  using (auth.uid() = user_id);

-- No user-writable policies: all writes go through service-role (attribution,
-- code generation). Deliberately no update/insert/delete policies exist here.

-- ============================================================================
-- Table 2: referral_rewards  (idempotency ledger + audit trail)
-- ----------------------------------------------------------------------------
-- One row per SUCCESSFUL reward grant. The UNIQUE(referred_user_id) is what
-- prevents a second reward if the same referred user has another yearly sub
-- later (e.g. renewal a year on). Also captures before/after expires_at for
-- both parties so an admin can reconstruct exactly what was granted.
-- ============================================================================
create table if not exists public.referral_rewards (
  id                         uuid        primary key default gen_random_uuid(),

  referrer_user_id           uuid        not null references auth.users(id) on delete restrict,
  referred_user_id           uuid        not null references auth.users(id) on delete restrict,
  triggering_subscription_id uuid        not null references public.subscriptions(id) on delete restrict,

  reward_type                text        not null default '1_month_free_both',
  granted_at                 timestamptz not null default now(),

  -- Audit: exact prev/new expires_at at grant time, per party.
  -- referrer_prev is null when the referrer had NO active sub before the grant
  -- (a comp sub was created for them).
  referrer_prev_expires_at   timestamptz,
  referrer_new_expires_at    timestamptz not null,
  referred_prev_expires_at   timestamptz not null,
  referred_new_expires_at    timestamptz not null,

  created_at                 timestamptz not null default now()
);

-- ONE reward per referred_user, forever. Renewal a year later doesn't re-reward.
create unique index if not exists referral_rewards_one_per_referred_user
  on public.referral_rewards(referred_user_id);

create index if not exists referral_rewards_referrer_idx
  on public.referral_rewards(referrer_user_id);

create index if not exists referral_rewards_subscription_idx
  on public.referral_rewards(triggering_subscription_id);

alter table public.referral_rewards enable row level security;

-- No RLS policies: service-role only. Admin console will read via service role
-- when we add the referrals tab.

-- ============================================================================
-- Function: apply_referral_reward(referred_user_id, subscription_id)
-- ----------------------------------------------------------------------------
-- Atomically grants the symmetric 1-month-free reward. Called by the edge fn
-- verify-razorpay-payment AFTER the triggering subscription has been flipped
-- to 'active'. Returns the reward row id on success, or null when no reward
-- was applied (no referrer / self-referral / already rewarded / sub not
-- eligible).
--
-- Failure modes:
--   - unique_violation on the ledger insert → transaction aborts, no changes
--     applied. Caller sees an exception and should treat as "already rewarded".
--   - Any other exception → aborts, no partial state.
-- ============================================================================
create or replace function public.apply_referral_reward(
  p_referred_user_id           uuid,
  p_triggering_subscription_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_referrer_id            uuid;
  v_referred_prev_expires  timestamptz;
  v_referred_new_expires   timestamptz;
  v_referrer_prev_expires  timestamptz;
  v_referrer_new_expires   timestamptz;
  v_referrer_sub_id        uuid;
  v_reward_id              uuid;
begin
  -- 1. Resolve the referrer (must have been attributed at signup).
  select referred_by_user_id
    into v_referrer_id
    from public.user_referrals
   where user_id = p_referred_user_id;

  if v_referrer_id is null then
    return null;  -- no referrer → nothing to do
  end if;

  -- 2. Self-referral guard (attribution step also blocks this, but be paranoid).
  if v_referrer_id = p_referred_user_id then
    return null;
  end if;

  -- 3. Idempotency: already rewarded this referred user? Return silently.
  --    A concurrent race between two callers still can't double-grant thanks
  --    to the UNIQUE constraint below — this is just the cheap-path check.
  if exists (
    select 1 from public.referral_rewards where referred_user_id = p_referred_user_id
  ) then
    return null;
  end if;

  -- 4. Load the triggering subscription (must belong to referred user + be active).
  select expires_at
    into v_referred_prev_expires
    from public.subscriptions
   where id      = p_triggering_subscription_id
     and user_id = p_referred_user_id
     and status  = 'active';

  if v_referred_prev_expires is null then
    return null;  -- sub not active or doesn't belong to referred user
  end if;

  -- 5. Extend the REFERRED user's expires_at by 30 days.
  v_referred_new_expires := v_referred_prev_expires + interval '30 days';
  update public.subscriptions
     set expires_at = v_referred_new_expires,
         updated_at = now()
   where id = p_triggering_subscription_id;

  -- 6. Extend or GRANT the REFERRER's Pro.
  --    Case A: referrer has an active sub → extend expires_at by 30 days.
  --    Case B: referrer is free → create a comp sub for 30 days from NOW
  --            (matches the comp pattern from 20260627120300).
  select id, expires_at
    into v_referrer_sub_id, v_referrer_prev_expires
    from public.subscriptions
   where user_id = v_referrer_id
     and status  = 'active'
   limit 1;

  if v_referrer_sub_id is not null then
    -- Case A: existing active sub, extend it.
    v_referrer_new_expires := v_referrer_prev_expires + interval '30 days';
    update public.subscriptions
       set expires_at = v_referrer_new_expires,
           updated_at = now()
     where id = v_referrer_sub_id;
  else
    -- Case B: free user, create comp sub.
    -- amount_paise=0 allowed by 20260627120300_allow_comp_subscriptions.
    -- razorpay_order_id 'ref-<uuid>' matches the comp naming convention
    -- (admin-visible source), keeps the audit trail clean.
    v_referrer_prev_expires := null;
    v_referrer_new_expires  := now() + interval '30 days';

    insert into public.subscriptions (
      user_id,
      plan,
      status,
      amount_paise,
      razorpay_order_id,
      started_at,
      expires_at
    ) values (
      v_referrer_id,
      'monthly',                                -- 30-day grant = monthly plan value
      'active',
      0,                                        -- comp
      'ref-' || gen_random_uuid()::text,        -- e.g. 'ref-c9e8...' — source-of-grant tag
      now(),
      v_referrer_new_expires
    );
  end if;

  -- 7. Ledger insert. UNIQUE(referred_user_id) guarantees single-grant.
  --    On unique_violation (race lost), transaction aborts → all expires_at
  --    updates above are rolled back → no partial reward.
  insert into public.referral_rewards (
    referrer_user_id,
    referred_user_id,
    triggering_subscription_id,
    reward_type,
    referrer_prev_expires_at,
    referrer_new_expires_at,
    referred_prev_expires_at,
    referred_new_expires_at
  ) values (
    v_referrer_id,
    p_referred_user_id,
    p_triggering_subscription_id,
    '1_month_free_both',
    v_referrer_prev_expires,
    v_referrer_new_expires,
    v_referred_prev_expires,
    v_referred_new_expires
  )
  returning id into v_reward_id;

  return v_reward_id;
end;
$$;

-- Lock this down: only service-role callers (edge functions) can grant rewards.
revoke all on function public.apply_referral_reward(uuid, uuid) from public;
revoke all on function public.apply_referral_reward(uuid, uuid) from anon;
revoke all on function public.apply_referral_reward(uuid, uuid) from authenticated;
grant  execute on function public.apply_referral_reward(uuid, uuid) to service_role;
