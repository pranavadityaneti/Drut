-- ============================================================
-- Migration: Advanced Analytics Functions
-- Purpose: Add RPC functions for detailed user analytics
-- ============================================================

-- 1. Topic Proficiency (Radar Chart)
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
    ROUND((COUNT(CASE WHEN h.is_correct THEN 1 END)::NUMERIC / COUNT(*)) * 100, 1) as accuracy,
    COUNT(*) as total_attempts
  FROM public.user_question_history h
  JOIN public.cached_questions q ON h.question_id = q.id
  WHERE h.user_id = p_user_id
  GROUP BY q.topic
  HAVING COUNT(*) >= 3; -- Minimum attempts to show data
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Learning Velocity (Area Chart)
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
    ROUND((COUNT(CASE WHEN h.is_correct THEN 1 END)::NUMERIC / COUNT(*)) * 100, 1) as accuracy
  FROM public.user_question_history h
  WHERE h.user_id = p_user_id
    AND h.attempted_at >= (CURRENT_DATE - p_days * INTERVAL '1 day')
  GROUP BY h.attempted_at::DATE
  ORDER BY day ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Sprint Performance (Scatter Plot)
CREATE OR REPLACE FUNCTION public.get_sprint_performance(p_user_id UUID)
RETURNS TABLE (
  session_id UUID,
  avg_time_ms INTEGER,
  accuracy NUMERIC,
  total_questions INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id as session_id,
    s.avg_time_ms,
    ROUND((s.correct_count::NUMERIC / NULLIF(s.total_questions, 0)) * 100, 1) as accuracy,
    s.total_questions
  FROM public.sprint_sessions s
  WHERE s.user_id = p_user_id
    AND s.total_questions > 0
    AND s.avg_time_ms IS NOT NULL
  ORDER BY s.started_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Weakest Subtopics (Alert Card)
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
    ROUND((COUNT(CASE WHEN h.is_correct THEN 1 END)::NUMERIC / COUNT(*)) * 100, 1) as accuracy,
    COUNT(*) as attempts
  FROM public.user_question_history h
  JOIN public.cached_questions q ON h.question_id = q.id
  WHERE h.user_id = p_user_id
  GROUP BY q.subtopic, q.topic
  HAVING COUNT(*) >= 5 -- Minimum attempts to be statistically relevant
  ORDER BY accuracy ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Activity Heatmap (Calendar)
CREATE OR REPLACE FUNCTION public.get_activity_heatmap(p_user_id UUID)
RETURNS TABLE (
  day DATE,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    attempted_at::DATE as day,
    COUNT(*) as count
  FROM public.user_question_history
  WHERE user_id = p_user_id
    AND attempted_at >= (CURRENT_DATE - INTERVAL '1 year')
  GROUP BY attempted_at::DATE
  ORDER BY day ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify PostgREST to reload schema
DO $$ 
BEGIN 
  PERFORM pg_notify('pgrst', 'reload schema'); 
EXCEPTION 
  WHEN OTHERS THEN NULL; 
END $$;
