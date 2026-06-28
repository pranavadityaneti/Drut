-- Free-tier 20/day cap: make the SERVER authoritative.
--
-- Before this, the limit lived ONLY in app code (see the comment in
-- 20260627120200_daily_question_usage.sql). increment_daily_question_usage()
-- blindly incremented, so the DB would happily accept counts past 20 and any path
-- that skipped the client gate could over-consume the free pool. This rewrites the
-- increment to be Pro-aware AND cap-aware so a non-Pro user's count can never be
-- pushed past the cap, while Pro users (active, unexpired subscription) are never
-- capped. Return type stays `integer` (the new count) so existing callers are
-- unchanged — no client signature change required.
--
-- NOTE: the cap (20) is duplicated from FREE_DAILY_QUESTION_LIMIT in
-- packages/shared/src/lib/pricing.ts. Keep them in sync — server-side enforcement
-- is the deliberate trade-off for the old "limit in app code only, no migration to
-- change it" flexibility.

create or replace function public.increment_daily_question_usage()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_pro  boolean;
  v_count   integer;
  v_limit   integer := 20;  -- keep in sync with FREE_DAILY_QUESTION_LIMIT
begin
  if v_user_id is null then
    raise exception 'must be authenticated to increment usage';
  end if;

  -- Authoritative Pro check (active subscription, not expired). Mirrors
  -- paymentService.isProActive, but evaluated server-side so a client can't spoof it.
  select exists (
    select 1 from public.subscriptions
    where user_id = v_user_id
      and status = 'active'
      and expires_at > now()
  ) into v_is_pro;

  if v_is_pro then
    -- Pro: unlimited. Still track the count for analytics.
    insert into public.daily_question_usage (user_id, usage_date, count, updated_at)
    values (v_user_id, current_date, 1, now())
    on conflict (user_id, usage_date) do update
      set count      = public.daily_question_usage.count + 1,
          updated_at = now()
    returning count into v_count;
    return v_count;
  end if;

  -- Free: increment ONLY while strictly under the cap (atomic). A brand-new row
  -- (first question today) always inserts count=1. For an existing row, the
  -- conflict-update's WHERE only fires while count < limit; once at the cap the
  -- WHERE is false, nothing updates, RETURNING yields no row → v_count is null, and
  -- we read back the (capped) current value and return it unchanged. Row-level
  -- locking on the conflicting row serializes concurrent increments, so two
  -- simultaneous requests at count=19 can never both push it to 21.
  insert into public.daily_question_usage (user_id, usage_date, count, updated_at)
  values (v_user_id, current_date, 1, now())
  on conflict (user_id, usage_date) do update
    set count      = public.daily_question_usage.count + 1,
        updated_at = now()
    where public.daily_question_usage.count < v_limit
  returning count into v_count;

  if v_count is null then
    select count into v_count
      from public.daily_question_usage
      where user_id = v_user_id and usage_date = current_date;
  end if;

  return coalesce(v_count, v_limit);
end;
$$;

revoke all on function public.increment_daily_question_usage() from public;
grant execute on function public.increment_daily_question_usage() to authenticated;

comment on function public.increment_daily_question_usage() is
  'Pro-aware, cap-aware atomic daily increment. Non-Pro users cannot exceed the free cap (20); Pro users are unlimited. Returns the new (possibly capped) count.';
