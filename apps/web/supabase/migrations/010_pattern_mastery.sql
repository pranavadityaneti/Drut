-- ============================================================
-- Migration: Pattern Mastery System
-- Purpose: Enable FSM-tag based question grouping and track
--          user mastery through streaks/debt mechanism
-- ============================================================

-- 1. Add fsm_tag column to cached_questions
-- This groups questions by their underlying heuristic pattern
ALTER TABLE public.cached_questions 
ADD COLUMN IF NOT EXISTS fsm_tag TEXT;

-- Index for fast lookups by fsm_tag
CREATE INDEX IF NOT EXISTS idx_cached_questions_fsm_tag 
  ON public.cached_questions(fsm_tag);

-- Composite index for fetching similar questions
CREATE INDEX IF NOT EXISTS idx_cached_questions_tag_exam 
  ON public.cached_questions(fsm_tag, exam_profile, topic);

-- 2. User Pattern Mastery Table
-- Tracks streaks, mastery level, and debt per pattern
CREATE TABLE IF NOT EXISTS public.user_pattern_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fsm_tag TEXT NOT NULL,
  mastery_level TEXT DEFAULT 'novice' CHECK (mastery_level IN ('novice', 'learning', 'verified')),
  streak INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMPTZ DEFAULT NOW(),
  is_in_debt BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fsm_tag)
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_pattern_mastery_user 
  ON public.user_pattern_mastery(user_id);

-- Index for debt-based queries (e.g., showing debt patterns first)
CREATE INDEX IF NOT EXISTS idx_user_pattern_mastery_debt 
  ON public.user_pattern_mastery(user_id, is_in_debt) WHERE is_in_debt = TRUE;

-- 3. Enable RLS
ALTER TABLE public.user_pattern_mastery ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for user_pattern_mastery
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_pattern_mastery' 
      AND policyname = 'user_pattern_mastery_select_own'
  ) THEN
    CREATE POLICY user_pattern_mastery_select_own
      ON public.user_pattern_mastery
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_pattern_mastery' 
      AND policyname = 'user_pattern_mastery_insert_own'
  ) THEN
    CREATE POLICY user_pattern_mastery_insert_own
      ON public.user_pattern_mastery
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_pattern_mastery' 
      AND policyname = 'user_pattern_mastery_update_own'
  ) THEN
    CREATE POLICY user_pattern_mastery_update_own
      ON public.user_pattern_mastery
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- 5. Function: Save Attempt and Update Mastery
-- Combines logging attempt with mastery updates in one transaction
CREATE OR REPLACE FUNCTION public.save_attempt_and_update_mastery(
  p_user_id UUID,
  p_question_uuid UUID,
  p_fsm_tag TEXT,
  p_is_correct BOOLEAN,
  p_time_ms INTEGER,
  p_target_time_ms INTEGER,
  p_selected_option_index INTEGER,
  p_skip_drill BOOLEAN DEFAULT FALSE
) RETURNS TABLE(
  new_streak INTEGER,
  new_mastery_level TEXT,
  is_now_in_debt BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_fast BOOLEAN;
  v_is_success BOOLEAN;
  v_current_streak INTEGER;
  v_new_streak INTEGER;
  v_new_level TEXT;
  v_in_debt BOOLEAN;
BEGIN
  -- Calculate success: correct AND fast
  v_is_fast := p_time_ms <= p_target_time_ms;
  v_is_success := p_is_correct AND v_is_fast AND NOT p_skip_drill;
  
  -- 1. Log the attempt in user_question_history
  INSERT INTO public.user_question_history(
    user_id, 
    question_id, 
    was_correct, 
    time_taken_ms, 
    selected_option_index,
    seen_at
  )
  VALUES (
    p_user_id, 
    p_question_uuid, 
    p_is_correct, 
    p_time_ms, 
    p_selected_option_index,
    NOW()
  )
  ON CONFLICT (user_id, question_id) DO UPDATE SET
    was_correct = EXCLUDED.was_correct,
    time_taken_ms = EXCLUDED.time_taken_ms,
    selected_option_index = EXCLUDED.selected_option_index,
    seen_at = NOW();

  -- 2. Update times_served on cached_questions
  UPDATE public.cached_questions
  SET times_served = times_served + 1,
      last_served_at = NOW()
  WHERE id = p_question_uuid;

  -- 3. Upsert user_pattern_mastery
  -- Get current streak if exists
  SELECT streak INTO v_current_streak
  FROM public.user_pattern_mastery
  WHERE user_id = p_user_id AND fsm_tag = p_fsm_tag;
  
  IF v_current_streak IS NULL THEN
    v_current_streak := 0;
  END IF;
  
  -- Calculate new streak
  IF v_is_success THEN
    v_new_streak := v_current_streak + 1;
    v_in_debt := FALSE;
  ELSIF p_skip_drill THEN
    -- User skipped the drill after failure
    v_new_streak := 0;
    v_in_debt := TRUE;
  ELSE
    -- Wrong or slow, but didn't skip (will do drill)
    v_new_streak := 0;
    v_in_debt := FALSE;
  END IF;
  
  -- Calculate mastery level based on streak
  IF v_new_streak >= 7 THEN
    v_new_level := 'verified';
  ELSIF v_new_streak >= 3 THEN
    v_new_level := 'learning';
  ELSE
    v_new_level := 'novice';
  END IF;
  
  -- Upsert the mastery record
  INSERT INTO public.user_pattern_mastery(
    user_id,
    fsm_tag,
    streak,
    mastery_level,
    is_in_debt,
    last_practiced_at
  )
  VALUES (
    p_user_id,
    p_fsm_tag,
    v_new_streak,
    v_new_level,
    v_in_debt,
    NOW()
  )
  ON CONFLICT (user_id, fsm_tag) DO UPDATE SET
    streak = v_new_streak,
    mastery_level = v_new_level,
    is_in_debt = v_in_debt,
    last_practiced_at = NOW();
  
  -- Return the results
  RETURN QUERY SELECT v_new_streak, v_new_level, v_in_debt;
END;
$$;

-- 6. Function: Get Question by FSM Tag (for "Prove It" flow)
CREATE OR REPLACE FUNCTION public.get_question_by_fsm_tag(
  p_user_id UUID,
  p_fsm_tag TEXT,
  p_exclude_question_id UUID DEFAULT NULL
) RETURNS SETOF public.cached_questions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT cq.*
  FROM public.cached_questions cq
  WHERE cq.fsm_tag = p_fsm_tag
    -- Exclude the specific question if provided
    AND (p_exclude_question_id IS NULL OR cq.id != p_exclude_question_id)
    -- Prefer questions user hasn't seen
    AND NOT EXISTS (
      SELECT 1 
      FROM public.user_question_history uqh 
      WHERE uqh.user_id = p_user_id 
        AND uqh.question_id = cq.id
    )
  ORDER BY cq.times_served ASC, cq.generated_at DESC
  LIMIT 1;
END;
$$;

-- 7. Function: Get User's Debt Patterns (for recommendation engine)
CREATE OR REPLACE FUNCTION public.get_debt_patterns(p_user_id UUID)
RETURNS TABLE(
  fsm_tag TEXT,
  last_practiced_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT fsm_tag, last_practiced_at
  FROM public.user_pattern_mastery
  WHERE user_id = p_user_id AND is_in_debt = TRUE
  ORDER BY last_practiced_at ASC;
$$;

-- 8. Grant permissions
GRANT ALL ON public.user_pattern_mastery TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_attempt_and_update_mastery TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_question_by_fsm_tag TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_debt_patterns TO authenticated;

-- 9. Notify PostgREST to reload schema
DO $$ 
BEGIN 
  PERFORM pg_notify('pgrst', 'reload schema'); 
EXCEPTION 
  WHEN OTHERS THEN NULL; 
END $$;
