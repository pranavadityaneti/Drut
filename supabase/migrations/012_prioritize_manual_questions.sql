-- ============================================================
-- Migration: Prioritize Manual "Golden Standard" Questions
-- Purpose: Update get_unseen_questions RPC to show manually
--          ingested questions (with fsm_tag) before AI-generated ones
-- ============================================================

-- Drop existing function if it exists (to replace it)
DROP FUNCTION IF EXISTS public.get_unseen_questions(UUID, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.get_unseen_questions(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER);

-- Recreate with priority ordering
CREATE OR REPLACE FUNCTION public.get_unseen_questions(
  p_user_id UUID,
  p_exam_profile TEXT,
  p_topic TEXT,
  p_subtopic TEXT,
  p_limit INTEGER DEFAULT 5
)
RETURNS SETOF public.cached_questions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.*
  FROM public.cached_questions q
  LEFT JOIN public.user_question_history h 
    ON q.id = h.question_id AND h.user_id = p_user_id
  WHERE 
    h.id IS NULL -- User hasn't seen it
    AND q.exam_profile = p_exam_profile
    AND (p_topic = 'ALL' OR q.topic = p_topic)
    AND (p_subtopic = 'ALL' OR q.subtopic = p_subtopic)
  ORDER BY 
    -- Priority 1: Questions with fsm_tag (manually ingested "Golden Standard")
    CASE WHEN q.fsm_tag IS NOT NULL THEN 0 ELSE 1 END ASC,
    -- Priority 2: Newest questions first (what we just uploaded)
    q.generated_at DESC,
    -- Priority 3: Random for variety among remaining
    RANDOM()
  LIMIT p_limit;
$$;

-- Also create version with difficulty filter
CREATE OR REPLACE FUNCTION public.get_unseen_questions(
  p_user_id UUID,
  p_exam_profile TEXT,
  p_topic TEXT,
  p_subtopic TEXT,
  p_difficulty TEXT,
  p_limit INTEGER DEFAULT 5
)
RETURNS SETOF public.cached_questions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.*
  FROM public.cached_questions q
  LEFT JOIN public.user_question_history h 
    ON q.id = h.question_id AND h.user_id = p_user_id
  WHERE 
    h.id IS NULL -- User hasn't seen it
    AND q.exam_profile = p_exam_profile
    AND (p_topic = 'ALL' OR q.topic = p_topic)
    AND (p_subtopic = 'ALL' OR q.subtopic = p_subtopic)
    AND (p_difficulty = 'ALL' OR q.difficulty = p_difficulty)
  ORDER BY 
    -- Priority 1: Questions with fsm_tag (manually ingested "Golden Standard")
    CASE WHEN q.fsm_tag IS NOT NULL THEN 0 ELSE 1 END ASC,
    -- Priority 2: Newest questions first (what we just uploaded)
    q.generated_at DESC,
    -- Priority 3: Random for variety among remaining
    RANDOM()
  LIMIT p_limit;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_unseen_questions(UUID, TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unseen_questions(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER) TO authenticated;

-- ============================================================
-- DEV HELPER: Get latest ingested questions for testing
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_latest_questions(
  p_limit INTEGER DEFAULT 5
)
RETURNS SETOF public.cached_questions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.*
  FROM public.cached_questions q
  WHERE q.fsm_tag IS NOT NULL -- Only manually tagged questions
  ORDER BY q.generated_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_latest_questions(INTEGER) TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
