-- referral codes: auto-generate per user + backfill existing.
--
-- WHAT: Every user (existing + future) gets a row in public.user_referrals with
-- a unique 6-character referral_code they can share. Missing on migration #1
-- (20260702120000_referrals) which only defined the table.
--
-- WHY (design):
--   Alphabet is A-Z + 2-9 minus ambiguous glyphs (I, L, O, 0, 1) → 30 chars.
--   6 positions → 30^6 = 729M combinations. Expected collision at 100k users
--   is ~7 — the loop retries up to 5 times before raising. Well past 100k
--   we'd move to 7 chars, but we don't need to now.
--
-- WHY trigger on auth.users (not app-side generation):
--   Guarantees every user has a code from the exact moment they exist. Also
--   works uniformly for email signup, Google OAuth signup, and admin-created
--   users — Supabase funnels all three through auth.users insert.
--
-- IDEMPOTENCY: ensure_user_referral_row skips users who already have a row.
-- The backfill DO block filters by NOT IN so it only touches users who need
-- one. Safe to re-run.

-- ============================================================================
-- 1. Code generator
-- ============================================================================
create or replace function public.generate_referral_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- 30 chars, no I/L/O/0/1
  code text := '';
  i int;
begin
  for i in 1..6 loop
    code := code || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
  end loop;
  return code;
end;
$$;

-- Client should never call this directly.
revoke all on function public.generate_referral_code() from public;
revoke all on function public.generate_referral_code() from anon;
revoke all on function public.generate_referral_code() from authenticated;
grant  execute on function public.generate_referral_code() to service_role;

-- ============================================================================
-- 2. Row-inserter with collision retry
-- ----------------------------------------------------------------------------
-- Idempotent + safe under concurrent calls. On unique-collision (~1e-8 per
-- retry at 100k users), loops and generates a fresh code. Raises after 5
-- consecutive collisions — effectively never happens at our scale.
-- ============================================================================
create or replace function public.ensure_user_referral_row(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code     text;
  v_attempts int := 0;
begin
  -- Cheap early-return if row already exists (backfill re-run + trigger idempotency).
  if exists (select 1 from public.user_referrals where user_id = p_user_id) then
    return;
  end if;

  loop
    v_code := public.generate_referral_code();
    begin
      insert into public.user_referrals (user_id, referral_code)
        values (p_user_id, v_code);
      return;                                     -- success path
    exception when unique_violation then
      v_attempts := v_attempts + 1;
      if v_attempts >= 5 then
        raise exception 'Could not allocate unique referral_code for user % after 5 attempts', p_user_id;
      end if;
      -- else: retry with a fresh code
    end;
  end loop;
end;
$$;

revoke all on function public.ensure_user_referral_row(uuid) from public;
revoke all on function public.ensure_user_referral_row(uuid) from anon;
revoke all on function public.ensure_user_referral_row(uuid) from authenticated;
grant  execute on function public.ensure_user_referral_row(uuid) to service_role;

-- ============================================================================
-- 3. Trigger on auth.users insert
-- ----------------------------------------------------------------------------
-- AFTER INSERT so the auth.users row is committed before we FK-reference it.
-- security definer + explicit search_path so it runs with the required
-- privileges regardless of the caller role (anon during email signup, the
-- Google OAuth service during OAuth, etc).
-- ============================================================================
create or replace function public.tg_auth_users_after_insert_ensure_referral()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.ensure_user_referral_row(new.id);
  return new;
end;
$$;

drop trigger if exists tg_auth_users_after_insert_ensure_referral on auth.users;
create trigger tg_auth_users_after_insert_ensure_referral
  after insert on auth.users
  for each row
  execute function public.tg_auth_users_after_insert_ensure_referral();

-- ============================================================================
-- 4. Backfill existing users
-- ----------------------------------------------------------------------------
-- For every auth.users row that doesn't yet have a user_referrals row,
-- generate + insert one. Idempotent — safe to re-run.
-- ============================================================================
do $$
declare
  v_missing_count int;
  v_backfilled    int := 0;
  r record;
begin
  select count(*) into v_missing_count
    from auth.users u
   where not exists (select 1 from public.user_referrals ur where ur.user_id = u.id);

  raise notice 'referral_codes backfill: % users need codes', v_missing_count;

  for r in
    select u.id
      from auth.users u
     where not exists (select 1 from public.user_referrals ur where ur.user_id = u.id)
  loop
    perform public.ensure_user_referral_row(r.id);
    v_backfilled := v_backfilled + 1;
  end loop;

  raise notice 'referral_codes backfill: % rows inserted', v_backfilled;
end $$;
