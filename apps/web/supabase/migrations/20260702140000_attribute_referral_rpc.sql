-- attribute_referral RPC — writes referred_by_code + referred_by_user_id on
-- the caller's public.user_referrals row after signup, given a code they
-- captured via the /r/:code landing.
--
-- WHY an RPC (not a direct client update): we need to atomically enforce
-- five invariants that a client-side UPDATE with RLS could not reliably
-- express — format validation, code existence, self-referral guard,
-- one-time-write idempotency, and single-transaction atomicity. Doing all
-- of them at the DB is the only place that's safe against a hostile client.
--
-- SECURITY MODEL:
--   - security definer + explicit search_path (defense against path attacks)
--   - Callable ONLY by 'authenticated' — never anon
--   - Returns jsonb {ok, reason} so the client can log without failing signup
--   - Never raises — every failure case is a structured no-op response

create or replace function public.attribute_referral(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id            uuid := auth.uid();
  v_normalized_code      text;
  v_referrer_id          uuid;
  v_existing_referrer_id uuid;
begin
  -- 1. Must be an authenticated user (auth.uid() is null for anon/service-role).
  if v_caller_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  -- 2. Format validation. Must match public.generate_referral_code alphabet
  --    exactly. Anything else is silently rejected — never trust the client.
  v_normalized_code := upper(coalesce(trim(p_code), ''));
  if v_normalized_code !~ '^[A-CDEFGHJKMNPQRSTUVWXYZ2-9]{6}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code_shape');
  end if;

  -- 3. Resolve code → referrer_user_id. If the code doesn't exist, no-op.
  select user_id
    into v_referrer_id
    from public.user_referrals
   where referral_code = v_normalized_code;

  if v_referrer_id is null then
    return jsonb_build_object('ok', false, 'reason', 'code_not_found');
  end if;

  -- 4. Self-referral guard.
  if v_referrer_id = v_caller_id then
    return jsonb_build_object('ok', false, 'reason', 'self_referral');
  end if;

  -- 5. Idempotency — once attributed, cannot be re-attributed. This makes the
  --    RPC safe to call repeatedly (e.g. if the auth-state listener fires
  --    twice during an OAuth roundtrip) without silently changing history.
  select referred_by_user_id
    into v_existing_referrer_id
    from public.user_referrals
   where user_id = v_caller_id;

  if v_existing_referrer_id is not null then
    return jsonb_build_object(
      'ok', false,
      'reason', 'already_attributed',
      'referred_by_user_id', v_existing_referrer_id
    );
  end if;

  -- 6. Write attribution. This UPDATE is safe under RLS because:
  --    - Function runs security definer (bypasses RLS).
  --    - We're only writing to the row matching v_caller_id — auth.uid()
  --      guarantees the caller can only ever attribute themselves.
  update public.user_referrals
     set referred_by_code    = v_normalized_code,
         referred_by_user_id = v_referrer_id
   where user_id = v_caller_id;

  return jsonb_build_object(
    'ok', true,
    'reason', 'attributed',
    'referred_by_user_id', v_referrer_id
  );
end;
$$;

revoke all on function public.attribute_referral(text) from public;
revoke all on function public.attribute_referral(text) from anon;
grant  execute on function public.attribute_referral(text) to authenticated;
grant  execute on function public.attribute_referral(text) to service_role;
