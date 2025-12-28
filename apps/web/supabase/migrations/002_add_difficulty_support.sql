-- ============================================================
-- Migration: Add Difficulty Level Support
-- Purpose: Add difficulty column to question cache and update
--          related functions to support Easy/Medium/Hard levels
-- ============================================================

-- 1. Add difficulty column to cached_questions table
ALTER TABLE public.cached_questions 
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Medium';

-- 2. Update index to include difficulty for efficient lookups
DROP INDEX IF EXISTS idx_cached_questions_lookup;
CREATE INDEX idx_cached_questions_lookup 
  ON public.cached_questions(exam_profile, topic, subtopic, difficulty);

-- 3. Update get_unseen_questions function to filter by difficulty
CREATE OR REPLACE FUNCTION public.get_unseen_questions(
  p_user_id UUID,
  p_exam TEXT,
  p_topic TEXT,
  p_subtopic TEXT,
  p_difficulty TEXT,
  p_count INTEGER DEFAULT 5
) RETURNS SETOF public.cached_questions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Get questions from cache that user hasn't seen
  RETURN QUERY
  SELECT cq.*
  FROM public.cached_questions cq
  WHERE cq.exam_profile = p_exam
    AND cq.topic = p_topic
    AND cq.subtopic = p_subtopic
    AND cq.difficulty = p_difficulty
    -- Exclude questions user has already seen
    AND NOT EXISTS (
      SELECT 1 
      FROM public.user_question_history uqh 
      WHERE uqh.user_id = p_user_id 
        AND uqh.question_id = cq.id
    )
  ORDER BY 
    -- Prioritize less-served questions
    cq.times_served ASC,
    -- Then by newest
    cq.generated_at DESC
  LIMIT p_count;
END;
$$;

-- 4. Update get_cache_stats function to include difficulty
CREATE OR REPLACE FUNCTION public.get_cache_stats(
  p_exam TEXT,
  p_topic TEXT,
  p_subtopic TEXT,
  p_difficulty TEXT
) RETURNS TABLE(
  total_cached INTEGER,
  avg_times_served NUMERIC,
  oldest_question TIMESTAMPTZ,
  newest_question TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(*)::INTEGER as total_cached,
    COALESCE(AVG(times_served), 0)::NUMERIC as avg_times_served,
    MIN(generated_at) as oldest_question,
    MAX(generated_at) as newest_question
  FROM public.cached_questions
  WHERE exam_profile = p_exam
    AND topic = p_topic
    AND subtopic = p_subtopic
    AND difficulty = p_difficulty;
$$;

-- 5. Notify PostgREST to reload schema
DO $$ 
BEGIN 
  PERFORM pg_notify('pgrst', 'reload schema'); 
EXCEPTION 
  WHEN OTHERS THEN NULL; 
END $$;
