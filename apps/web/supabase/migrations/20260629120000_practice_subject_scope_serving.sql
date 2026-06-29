-- ============================================================
-- Practice serving: subject scope + server-side trust gate (forlater #1)
-- ------------------------------------------------------------
-- Two bugs made practice/sprint return "No questions available" even though
-- hundreds of servable questions existed:
--
--  (1) NO SUBJECT FILTER + wrong sentinel. The app's "all chapters" mode passed
--      the SUBJECT NAME as p_topic ('Physics'), but get_unseen_questions matched
--      topic exactly ('ALL' = any). Stored topics are chapter names, so it matched
--      0 rows. Fix: add an optional p_subject filter; callers now pass p_topic='ALL'
--      + p_subject for all-chapters.
--
--  (2) NO TRUST GATE IN THE RPC. get_unseen_questions returned legacy (old-format /
--      non-approved, e.g. 'v3-verified-rag') rows ordered FIRST, which the client
--      trust gate (isServableQuestion) then discarded -> the user saw nothing AND,
--      via count-on-serve, BURNED daily quota on rows that were never shown. Fix:
--      apply the SAME gate the client uses (new-format quickMethod+fullSolution +
--      approved verification_status) inside the RPC, so it ONLY ever returns and
--      meters servable rows. The client gate becomes a redundant safety net.
--
-- Mirrors packages/shared/src/services/questionCacheService.ts isServableQuestion
-- (case-sensitive substring match -> SQL LIKE, not ILIKE).
-- ============================================================

DROP FUNCTION IF EXISTS public.get_unseen_questions(uuid, text, text, text, text, integer);
DROP FUNCTION IF EXISTS public.get_unseen_questions(uuid, text, text, text, text, integer, text);

CREATE FUNCTION public.get_unseen_questions(
  p_user_id uuid,
  p_exam_profile text,
  p_topic text,
  p_subtopic text,
  p_difficulty text,
  p_limit integer DEFAULT 5,
  p_subject text DEFAULT NULL
) RETURNS SETOF public.cached_questions
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT q.*
  FROM public.cached_questions q
  LEFT JOIN public.user_question_history h
    ON q.id = h.question_id AND h.user_id = p_user_id
  WHERE h.id IS NULL
    AND q.exam_profile = p_exam_profile
    AND (p_topic = 'ALL' OR q.topic = p_topic)
    AND (p_subtopic = 'ALL' OR q.subtopic = p_subtopic)
    AND (p_difficulty = 'ALL' OR q.difficulty = p_difficulty)
    AND (p_subject IS NULL OR p_subject = 'ALL' OR q.subject = p_subject)
    -- Server-side trust gate (mirrors client isServableQuestion):
    AND jsonb_exists(q.question_data, 'quickMethod')
    AND jsonb_exists(q.question_data, 'fullSolution')
    AND (
      q.verification_status LIKE '%ai-openai-audited%'
      OR q.verification_status LIKE '%v3-verified-pyq%'
      OR q.verification_status LIKE '%admin-verified%'
      OR q.verification_status LIKE '%manual-curated%'
      OR q.verification_status LIKE '%2.6%'
      OR q.verification_status LIKE '%SubjectFallback%'
    )
  ORDER BY
    CASE WHEN q.fsm_tag IS NOT NULL THEN 0 ELSE 1 END ASC,
    q.generated_at DESC,
    RANDOM()
  LIMIT p_limit;
$$;
-- Stays PRIVATE: only serve_unseen_questions (SECURITY DEFINER) may call it,
-- so the count-on-serve meter cannot be bypassed via a raw API call.
REVOKE ALL ON FUNCTION public.get_unseen_questions(uuid,text,text,text,text,integer,text) FROM PUBLIC;

DROP FUNCTION IF EXISTS public.serve_unseen_questions(uuid, text, text, text, text, integer);
DROP FUNCTION IF EXISTS public.serve_unseen_questions(uuid, text, text, text, text, integer, text);

CREATE FUNCTION public.serve_unseen_questions(
  p_user_id uuid,
  p_exam_profile text,
  p_topic text,
  p_subtopic text,
  p_difficulty text,
  p_limit integer DEFAULT 5,
  p_subject text DEFAULT NULL
) RETURNS SETOF public.cached_questions
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
declare
  v_is_pro boolean; v_used integer; v_limit integer := 20; v_effective integer; v_ids uuid[]; v_n integer;
begin
  if p_user_id is null or p_user_id <> auth.uid() then
    raise exception 'must be the authenticated user';
  end if;
  select exists (select 1 from public.subscriptions
    where user_id = p_user_id and status = 'active' and expires_at > now()) into v_is_pro;
  if v_is_pro then
    v_effective := greatest(coalesce(p_limit, 0), 0);
  else
    select duq.count into v_used from public.daily_question_usage duq
      where duq.user_id = p_user_id and duq.usage_date = current_date for update;
    v_used := coalesce(v_used, 0);
    v_effective := least(greatest(coalesce(p_limit, 0), 0), greatest(0, v_limit - v_used));
  end if;
  if v_effective <= 0 then return; end if;

  select array_agg(g.id) into v_ids
  from public.get_unseen_questions(
         p_user_id, p_exam_profile, p_topic, p_subtopic, p_difficulty, v_effective, p_subject
       ) g;
  if v_ids is null or array_length(v_ids, 1) = 0 then return; end if;
  v_n := array_length(v_ids, 1);

  insert into public.user_question_history (user_id, question_id, seen_at)
  select p_user_id, qid, now() from unnest(v_ids) as qid
  on conflict (user_id, question_id) do nothing;

  update public.cached_questions
    set times_served = times_served + 1, last_served_at = now()
    where id = any(v_ids);

  if not v_is_pro then
    insert into public.daily_question_usage (user_id, usage_date, count, updated_at)
    values (p_user_id, current_date, v_n, now())
    on conflict (user_id, usage_date) do update
      set count = least(public.daily_question_usage.count + v_n, v_limit), updated_at = now();
  end if;

  return query select q.* from public.cached_questions q where q.id = any(v_ids);
end;
$$;
REVOKE ALL ON FUNCTION public.serve_unseen_questions(uuid,text,text,text,text,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.serve_unseen_questions(uuid,text,text,text,text,integer,text) TO authenticated;

NOTIFY pgrst, 'reload schema';
