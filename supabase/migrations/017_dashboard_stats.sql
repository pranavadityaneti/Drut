-- Migration: Dashboard Stats Improvements
-- Purpose: Add RPCs for subtopic stats and streak calculation

-- 1. Get stats for a specific subtopic
CREATE OR REPLACE FUNCTION public.get_subtopic_stats(p_user_id UUID, p_subtopic TEXT)
RETURNS TABLE (
  total_attempts BIGINT,
  accuracy NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_attempts,
    ROUND((COUNT(CASE WHEN h.is_correct THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1) as accuracy
  FROM public.user_question_history h
  JOIN public.cached_questions q ON h.question_id = q.id
  WHERE h.user_id = p_user_id
    AND q.subtopic = p_subtopic;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Get current user streak
CREATE OR REPLACE FUNCTION public.get_user_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_streak INTEGER := 0;
  v_last_date DATE := CURRENT_DATE;
  v_found BOOLEAN;
BEGIN
  -- Check if practiced today
  SELECT EXISTS (
    SELECT 1 FROM public.user_question_history 
    WHERE user_id = p_user_id AND seen_at::DATE = CURRENT_DATE
  ) INTO v_found;

  IF v_found THEN
    v_streak := 1;
    v_last_date := CURRENT_DATE - 1;
  ELSE
    -- If not today, check yesterday (streak is still active if they practiced yesterday)
    v_last_date := CURRENT_DATE - 1;
    SELECT EXISTS (
      SELECT 1 FROM public.user_question_history 
      WHERE user_id = p_user_id AND seen_at::DATE = v_last_date
    ) INTO v_found;
    
    IF v_found THEN
      v_streak := 1;
      v_last_date := v_last_date - 1;
    ELSE
      RETURN 0;
    END IF;
  END IF;

  -- Count backwards
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.user_question_history 
      WHERE user_id = p_user_id AND seen_at::DATE = v_last_date
    ) INTO v_found;

    IF v_found THEN
      v_streak := v_streak + 1;
      v_last_date := v_last_date - 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN v_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Notify Schema Reload
DO $$ 
BEGIN 
  PERFORM pg_notify('pgrst', 'reload schema'); 
EXCEPTION 
  WHEN OTHERS THEN NULL; 
END $$;
