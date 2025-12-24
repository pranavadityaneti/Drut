-- ============================================================
-- Migration: Fix Analytics RPC Functions
-- Purpose: Fix column name mismatches and ensure functions exist
-- ============================================================

-- 1. Fix get_weakest_subtopics - use was_correct instead of is_correct
CREATE OR REPLACE FUNCTION public.get_weakest_subtopics(p_user_id UUID, p_limit INT DEFAULT 3)
RETURNS TABLE (
  subtopic TEXT,
  topic TEXT,
  accuracy NUMERIC,
  attempts BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.subtopic,
    q.topic,
    ROUND((COUNT(CASE WHEN h.was_correct THEN 1 END)::NUMERIC / COUNT(*)) * 100, 1) as accuracy,
    COUNT(*) as attempts
  FROM public.user_question_history h
  JOIN public.cached_questions q ON h.question_id = q.id
  WHERE h.user_id = p_user_id
  GROUP BY q.subtopic, q.topic
  HAVING COUNT(*) >= 3 -- Lowered from 5 to 3 for testing
  ORDER BY accuracy ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix get_topic_proficiency - use was_correct instead of is_correct
CREATE OR REPLACE FUNCTION public.get_topic_proficiency(p_user_id UUID)
RETURNS TABLE (
  topic TEXT,
  accuracy NUMERIC,
  total_attempts BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.topic,
    ROUND((COUNT(CASE WHEN h.was_correct THEN 1 END)::NUMERIC / COUNT(*)) * 100, 1) as accuracy,
    COUNT(*) as total_attempts
  FROM public.user_question_history h
  JOIN public.cached_questions q ON h.question_id = q.id
  WHERE h.user_id = p_user_id
  GROUP BY q.topic
  HAVING COUNT(*) >= 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create get_stamina_curve (ensure it exists)
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

-- 4. Fix get_learning_velocity - use was_correct
CREATE OR REPLACE FUNCTION public.get_learning_velocity(p_user_id UUID, p_days INT DEFAULT 30)
RETURNS TABLE (
  day DATE,
  questions_answered BIGINT,
  accuracy NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.attempted_at::DATE as day,
    COUNT(*) as questions_answered,
    ROUND((COUNT(CASE WHEN h.was_correct THEN 1 END)::NUMERIC / COUNT(*)) * 100, 1) as accuracy
  FROM public.user_question_history h
  WHERE h.user_id = p_user_id
    AND h.attempted_at >= (CURRENT_DATE - p_days * INTERVAL '1 day')
  GROUP BY h.attempted_at::DATE
  ORDER BY day ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Notify PostgREST to reload schema
DO $$ 
BEGIN 
  PERFORM pg_notify('pgrst', 'reload schema'); 
EXCEPTION 
  WHEN OTHERS THEN NULL; 
END $$;
