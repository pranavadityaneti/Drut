-- ============================================================
-- Migration: Dashboard Realtime Helpers
-- Purpose: Efficient functions for dashboard counters and trends
-- ============================================================

-- 1. Get Topic Pattern Counts (Total available patterns)
-- Used to calculate progress percentage accurately
CREATE OR REPLACE FUNCTION public.get_topic_pattern_counts()
RETURNS TABLE (
  topic TEXT,
  total_patterns INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cq.topic,
    COUNT(DISTINCT cq.fsm_tag)::INTEGER
  FROM public.cached_questions cq
  WHERE cq.fsm_tag IS NOT NULL
  GROUP BY cq.topic;
END;
$$;

-- 2. Get User Accuracy Trend
-- Compares this week's accuracy vs last week's
CREATE OR REPLACE FUNCTION public.get_user_accuracy_trend(p_user_id UUID)
RETURNS TABLE (
  current_accuracy NUMERIC,
  previous_accuracy NUMERIC,
  trend_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_curr_correct BIGINT;
  v_curr_total BIGINT;
  v_prev_correct BIGINT;
  v_prev_total BIGINT;
  v_curr_acc NUMERIC;
  v_prev_acc NUMERIC;
BEGIN
  -- Current Week (Last 7 days)
  SELECT 
    COUNT(CASE WHEN was_correct THEN 1 END),
    COUNT(*)
  INTO v_curr_correct, v_curr_total
  FROM public.user_question_history
  WHERE user_id = p_user_id
    AND seen_at >= (NOW() - INTERVAL '7 days');

  -- Previous Week (7-14 days ago)
  SELECT 
    COUNT(CASE WHEN was_correct THEN 1 END),
    COUNT(*)
  INTO v_prev_correct, v_prev_total
  FROM public.user_question_history
  WHERE user_id = p_user_id
    AND seen_at >= (NOW() - INTERVAL '14 days')
    AND seen_at < (NOW() - INTERVAL '7 days');

  -- Calculate Accuracies
  v_curr_acc := CASE WHEN v_curr_total > 0 THEN (v_curr_correct::NUMERIC / v_curr_total) * 100 ELSE 0 END;
  v_prev_acc := CASE WHEN v_prev_total > 0 THEN (v_prev_correct::NUMERIC / v_prev_total) * 100 ELSE 0 END;

  RETURN QUERY SELECT 
    ROUND(v_curr_acc, 1),
    ROUND(v_prev_acc, 1),
    ROUND(v_curr_acc - v_prev_acc, 1);
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_topic_pattern_counts TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_accuracy_trend TO authenticated;

-- 4. Notify PostgREST
DO $$ 
BEGIN 
  PERFORM pg_notify('pgrst', 'reload schema'); 
EXCEPTION 
  WHEN OTHERS THEN NULL; 
END $$;
