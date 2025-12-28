-- ============================================================
-- Migration: Question Caching System with User Tracking
-- Purpose: Cache AI-generated questions globally while tracking
--          which questions each user has seen (no repetition)
-- ============================================================

-- 1. Global Question Cache Table
-- Stores all generated questions that can be reused across users
CREATE TABLE IF NOT EXISTS public.cached_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT UNIQUE NOT NULL,
  exam_profile TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT NOT NULL,
  question_data JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  times_served INTEGER DEFAULT 0,
  last_served_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_cached_questions_lookup 
  ON public.cached_questions(exam_profile, topic, subtopic);

CREATE INDEX IF NOT EXISTS idx_cached_questions_served 
  ON public.cached_questions(times_served, generated_at);

-- 2. User Question History Table
-- Tracks which questions each user has seen (prevents repetition)
CREATE TABLE IF NOT EXISTS public.user_question_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.cached_questions(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ DEFAULT NOW(),
  was_correct BOOLEAN,
  time_taken_ms INTEGER,
  UNIQUE(user_id, question_id)
);

-- Index for fast user-specific lookups
CREATE INDEX IF NOT EXISTS idx_user_question_history_user 
  ON public.user_question_history(user_id, seen_at DESC);

-- 3. Enable RLS on both tables
ALTER TABLE public.cached_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_question_history ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for cached_questions
-- Anyone can read cached questions (they're not user-specific)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'cached_questions' 
      AND policyname = 'cached_questions_read_all'
  ) THEN
    CREATE POLICY cached_questions_read_all
      ON public.cached_questions
      FOR SELECT
      TO authenticated, anon
      USING (true);
  END IF;
END$$;

-- Only authenticated users can insert (during generation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'cached_questions' 
      AND policyname = 'cached_questions_insert_auth'
  ) THEN
    CREATE POLICY cached_questions_insert_auth
      ON public.cached_questions
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END$$;

-- 5. RLS Policies for user_question_history
-- Users can only see their own history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_question_history' 
      AND policyname = 'user_history_select_own'
  ) THEN
    CREATE POLICY user_history_select_own
      ON public.user_question_history
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- Users can only insert their own history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_question_history' 
      AND policyname = 'user_history_insert_own'
  ) THEN
    CREATE POLICY user_history_insert_own
      ON public.user_question_history
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- 6. Function: Get Unseen Questions for User
-- Returns questions the user has NOT seen before
CREATE OR REPLACE FUNCTION public.get_unseen_questions(
  p_user_id UUID,
  p_exam TEXT,
  p_topic TEXT,
  p_subtopic TEXT,
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

-- 7. Function: Mark Questions as Seen by User
CREATE OR REPLACE FUNCTION public.mark_questions_seen(
  p_user_id UUID,
  p_question_ids UUID[]
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INTEGER := 0;
  v_question_id UUID;
BEGIN
  -- Insert each question into history
  FOREACH v_question_id IN ARRAY p_question_ids
  LOOP
    INSERT INTO public.user_question_history(user_id, question_id)
    VALUES (p_user_id, v_question_id)
    ON CONFLICT (user_id, question_id) DO NOTHING;
    
    IF FOUND THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;
  
  -- Update serve stats on cached questions
  UPDATE public.cached_questions
  SET 
    times_served = times_served + 1,
    last_served_at = NOW()
  WHERE id = ANY(p_question_ids);
  
  RETURN v_inserted;
END;
$$;

-- 8. Function: Get Cache Statistics
CREATE OR REPLACE FUNCTION public.get_cache_stats(
  p_exam TEXT,
  p_topic TEXT,
  p_subtopic TEXT
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
    AND subtopic = p_subtopic;
$$;

-- 9. Function: Get User Progress Stats
CREATE OR REPLACE FUNCTION public.get_user_question_stats(p_user_id UUID)
RETURNS TABLE(
  total_seen INTEGER,
  unique_topics INTEGER,
  last_practice TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(DISTINCT uqh.question_id)::INTEGER as total_seen,
    COUNT(DISTINCT cq.topic || '::' || cq.subtopic)::INTEGER as unique_topics,
    MAX(uqh.seen_at) as last_practice
  FROM public.user_question_history uqh
  JOIN public.cached_questions cq ON uqh.question_id = cq.id
  WHERE uqh.user_id = p_user_id;
$$;

-- 10. Grant necessary permissions
GRANT ALL ON public.cached_questions TO authenticated;
GRANT ALL ON public.user_question_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unseen_questions TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_questions_seen TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cache_stats TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_question_stats TO authenticated;

-- 11. Notify PostgREST to reload schema
DO $$ 
BEGIN 
  PERFORM pg_notify('pgrst', 'reload schema'); 
EXCEPTION 
  WHEN OTHERS THEN NULL; 
END $$;
