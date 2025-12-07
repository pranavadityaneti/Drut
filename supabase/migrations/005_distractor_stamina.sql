-- ============================================================
-- Migration: Distractor Analysis & Stamina Curve Support
-- Purpose: Add columns to track specific user choices and
--          create RPC functions for deep dive analytics.
-- ============================================================

-- 1. Add selected_option_index to user_question_history (Practice Mode)
ALTER TABLE public.user_question_history 
ADD COLUMN IF NOT EXISTS selected_option_index INTEGER;

-- 2. Add selected_option_index to sprint_question_attempts (Sprint Mode)
ALTER TABLE public.sprint_question_attempts 
ADD COLUMN IF NOT EXISTS selected_option_index INTEGER;

-- 3. Function: Get Distractor Analysis
-- Returns the most frequently chosen wrong answers per subtopic
CREATE OR REPLACE FUNCTION public.get_distractor_analysis(p_user_id UUID)
RETURNS TABLE (
  subtopic TEXT,
  wrong_answer_text TEXT,
  choice_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH wrong_attempts AS (
    SELECT 
      q.subtopic,
      h.selected_option_index,
      q.question_data
    FROM public.user_question_history h
    JOIN public.cached_questions q ON h.question_id = q.id
    WHERE h.user_id = p_user_id
      AND h.was_correct = false
      AND h.selected_option_index IS NOT NULL
  )
  SELECT 
    wa.subtopic,
    -- Extract the option text from the JSON array using the index
    -- Note: JSON arrays are 0-indexed in Postgres JSONB access
    (wa.question_data->'options'->>wa.selected_option_index)::TEXT as wrong_answer_text,
    COUNT(*) as choice_count
  FROM wrong_attempts wa
  GROUP BY wa.subtopic, wrong_answer_text
  HAVING COUNT(*) >= 1
  ORDER BY choice_count DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function: Get Stamina Curve (Latest Sprint)
-- Returns performance data for the user's most recent sprint session
CREATE OR REPLACE FUNCTION public.get_stamina_curve(p_user_id UUID)
RETURNS TABLE (
  question_index BIGINT,
  time_taken_ms INTEGER,
  is_correct BOOLEAN
) AS $$
DECLARE
  v_latest_session_id UUID;
BEGIN
  -- Get the most recent session ID for the user
  SELECT id INTO v_latest_session_id
  FROM public.sprint_sessions
  WHERE user_id = p_user_id
  ORDER BY started_at DESC
  LIMIT 1;

  RETURN QUERY
  SELECT 
    ROW_NUMBER() OVER (ORDER BY attempted_at ASC) as question_index,
    sqa.time_taken_ms,
    (sqa.result = 'correct') as is_correct
  FROM public.sprint_question_attempts sqa
  WHERE sqa.session_id = v_latest_session_id
  ORDER BY attempted_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Notify PostgREST to reload schema
DO $$ 
BEGIN 
  PERFORM pg_notify('pgrst', 'reload schema'); 
EXCEPTION 
  WHEN OTHERS THEN NULL; 
END $$;
