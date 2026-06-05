-- Migration: 031_fix_analytics_rpcs
--
-- Purpose: Fix two analytics RPCs that referenced column names which don't
-- exist on user_question_history. Both functions errored on every dashboard
-- load (visible as 400 Bad Request + 42703 undefined_column in the browser
-- console). The dashboard partially rendered because other stats RPCs work,
-- but Topic Focus and Learning Velocity cards showed 0/empty.
--
-- Pre-existing bug, surfaced 2026-06-05 when Pranav opened the dashboard
-- and noticed the console errors. The user_question_history schema uses
-- `was_correct` and `seen_at`; the RPCs were written against an older
-- schema with `is_correct` and `attempted_at`. Fix is mechanical column
-- rename inside the function bodies; no behavior change, no signature
-- change, no caller change.
--
-- Applied on production via Supabase Management API on 2026-06-05.
-- This file exists so a fresh `supabase db push` recreates the same state.

-- ---------------------------------------------------------------------------
-- get_learning_velocity: attempted_at -> seen_at (3 occurrences)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_learning_velocity(p_user_id uuid, p_days integer DEFAULT 30)
 RETURNS TABLE(day date, questions_answered bigint, accuracy numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.seen_at::DATE as day,
    COUNT(*) as questions_answered,
    ROUND((COUNT(CASE WHEN h.was_correct THEN 1 END)::NUMERIC / COUNT(*)) * 100, 1) as accuracy
  FROM public.user_question_history h
  WHERE h.user_id = p_user_id
    AND h.seen_at >= (CURRENT_DATE - p_days * INTERVAL '1 day')
  GROUP BY h.seen_at::DATE
  ORDER BY day ASC;
END;
$$;

-- ---------------------------------------------------------------------------
-- get_subtopic_stats: is_correct -> was_correct (1 occurrence)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_subtopic_stats(p_user_id uuid, p_subtopic text)
 RETURNS TABLE(total_attempts bigint, accuracy numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_attempts,
    ROUND((COUNT(CASE WHEN h.was_correct THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1) as accuracy
  FROM public.user_question_history h
  JOIN public.cached_questions q ON h.question_id = q.id
  WHERE h.user_id = p_user_id
    AND q.subtopic = p_subtopic;
END;
$$;

-- get_weakest_subtopics was inspected during this fix — it already uses
-- the correct column names (was_correct) and is NOT modified here.
