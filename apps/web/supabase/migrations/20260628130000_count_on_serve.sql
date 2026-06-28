-- Count-on-serve: meter the free-tier daily quota when a question is SERVED,
-- atomically and server-side, so NO path — app flow OR a raw API call — can fetch
-- beyond the daily cap.
--
-- Before this, metering happened in app code AFTER the user answered. A user calling
-- the serving RPC directly (with their JWT) could fetch unlimited questions by simply
-- never calling the increment. This makes the serving function itself the meter.
--
-- serve_unseen_questions becomes the client-callable serving function. It delegates
-- SELECTION (and its priority ordering) to the existing, proven get_unseen_questions
-- (left unchanged), then marks the served rows seen and increments the daily count by
-- the number actually served — all in one transaction.
--
-- This migration is ADDITIVE and safe to apply while the OLD client (which still
-- calls get_unseen_questions directly) is live: both functions work during the
-- transition. The follow-up migration 20260628130100 REVOKEs direct access to
-- get_unseen_questions to close the raw-API bypass — apply that ONLY after the
-- count-on-serve client is live in production, or prod serving will break.
--
-- Semantics change: a free question is spent when it is SHOWN, not when answered, so
-- skipping/abandoning a question still counts toward the daily 20.
--
-- NOTE: the cap (20) is duplicated from FREE_DAILY_QUESTION_LIMIT in
-- packages/shared/src/lib/pricing.ts — keep them in sync.

create or replace function public.serve_unseen_questions(
  p_user_id      uuid,
  p_exam_profile text,
  p_topic        text,
  p_subtopic     text,
  p_difficulty   text,
  p_limit        integer default 5
)
returns setof public.cached_questions
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_is_pro    boolean;
  v_used      integer;
  v_limit     integer := 20;  -- keep in sync with FREE_DAILY_QUESTION_LIMIT
  v_effective integer;
  v_ids       uuid[];
  v_n         integer;
begin
  -- Only the authenticated caller may serve to themselves.
  if p_user_id is null or p_user_id <> auth.uid() then
    raise exception 'must be the authenticated user';
  end if;

  -- Authoritative Pro check (active, unexpired subscription).
  select exists (
    select 1 from public.subscriptions
    where user_id = p_user_id and status = 'active' and expires_at > now()
  ) into v_is_pro;

  if v_is_pro then
    v_effective := greatest(coalesce(p_limit, 0), 0);
  else
    -- Lock today's usage row (if present) so concurrent serves for this user
    -- serialize and can't both consume the same remaining slot.
    select duq.count into v_used
      from public.daily_question_usage duq
      where duq.user_id = p_user_id and duq.usage_date = current_date
      for update;
    v_used := coalesce(v_used, 0);
    v_effective := least(greatest(coalesce(p_limit, 0), 0), greatest(0, v_limit - v_used));
  end if;

  if v_effective <= 0 then
    return; -- no quota left (or nothing requested) → empty set; client shows paywall
  end if;

  -- Delegate selection to the proven serving function, capped to what's allowed.
  select array_agg(g.id) into v_ids
  from public.get_unseen_questions(
         p_user_id, p_exam_profile, p_topic, p_subtopic, p_difficulty, v_effective
       ) g;

  if v_ids is null or array_length(v_ids, 1) = 0 then
    return; -- nothing available to serve (do NOT meter — we served nothing)
  end if;

  v_n := array_length(v_ids, 1);

  -- Mark served rows seen (idempotent) and bump serve stats — mirrors
  -- mark_questions_seen, which the client no longer calls for this path.
  insert into public.user_question_history (user_id, question_id, seen_at)
  select p_user_id, qid, now()
  from unnest(v_ids) as qid
  on conflict (user_id, question_id) do nothing;

  update public.cached_questions
    set times_served = times_served + 1, last_served_at = now()
    where id = any(v_ids);

  -- METER on serve (free users only), capped at the daily limit.
  if not v_is_pro then
    insert into public.daily_question_usage (user_id, usage_date, count, updated_at)
    values (p_user_id, current_date, v_n, now())
    on conflict (user_id, usage_date) do update
      set count      = least(public.daily_question_usage.count + v_n, v_limit),
          updated_at = now();
  end if;

  -- Return the served rows (shape identical to get_unseen_questions).
  return query
    select q.* from public.cached_questions q where q.id = any(v_ids);
end;
$$;

revoke all on function public.serve_unseen_questions(uuid, text, text, text, text, integer) from public;
grant execute on function public.serve_unseen_questions(uuid, text, text, text, text, integer) to authenticated;

comment on function public.serve_unseen_questions(uuid, text, text, text, text, integer) is
  'Metered serving path (count-on-serve). Returns at most the free user''s remaining daily quota of unseen questions, marks them seen, and increments the daily count atomically. Pro users are unlimited. The ONLY client-callable question-serving function.';
