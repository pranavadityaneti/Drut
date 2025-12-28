-- ============================================================
-- Migration: Sprint Mode Tables and Functions
-- Purpose: Add tables for Sprint Mode sessions and question attempts
--          with comprehensive analytics tracking
-- ============================================================

-- 1. Sprint Sessions Table
CREATE TABLE IF NOT EXISTS public.sprint_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_profile TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT NOT NULL,
  
  -- Session stats
  total_questions INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  
  -- Timing
  avg_time_ms INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  -- Session type
  is_retry BOOLEAN DEFAULT false,
  parent_session_id UUID REFERENCES public.sprint_sessions(id) ON DELETE SET NULL,
  
  CONSTRAINT valid_counts CHECK (
    total_questions = correct_count + wrong_count + skipped_count
  )
);

-- 2. Sprint Question Attempts Table
CREATE TABLE IF NOT EXISTS public.sprint_question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sprint_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.cached_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Attempt data
  result TEXT NOT NULL CHECK (result IN ('correct', 'wrong', 'skipped')),
  time_taken_ms INTEGER NOT NULL,
  score_earned INTEGER NOT NULL,
  input_method TEXT CHECK (input_method IN ('tap', 'click', 'swipe', 'keyboard_s', 'timeout')),
  
  -- Question snapshot (for retry)
  question_data JSONB NOT NULL,
  
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sprint_sessions_user 
  ON public.sprint_sessions(user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sprint_sessions_exam 
  ON public.sprint_sessions(exam_profile, topic, subtopic);

CREATE INDEX IF NOT EXISTS idx_sprint_attempts_session 
  ON public.sprint_question_attempts(session_id);

CREATE INDEX IF NOT EXISTS idx_sprint_attempts_user 
  ON public.sprint_question_attempts(user_id, attempted_at DESC);

-- 4. Enable RLS
ALTER TABLE public.sprint_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_question_attempts ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for sprint_sessions

-- Users can view their own sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'sprint_sessions' 
      AND policyname = 'sprint_sessions_select_own'
  ) THEN
    CREATE POLICY sprint_sessions_select_own
      ON public.sprint_sessions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- Users can create their own sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'sprint_sessions' 
      AND policyname = 'sprint_sessions_insert_own'
  ) THEN
    CREATE POLICY sprint_sessions_insert_own
      ON public.sprint_sessions
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- Users can update their own sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'sprint_sessions' 
      AND policyname = 'sprint_sessions_update_own'
  ) THEN
    CREATE POLICY sprint_sessions_update_own
      ON public.sprint_sessions
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- 6. RLS Policies for sprint_question_attempts

-- Users can view their own attempts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'sprint_question_attempts' 
      AND policyname = 'sprint_attempts_select_own'
  ) THEN
    CREATE POLICY sprint_attempts_select_own
      ON public.sprint_question_attempts
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- Users can insert their own attempts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'sprint_question_attempts' 
      AND policyname = 'sprint_attempts_insert_own'
  ) THEN
    CREATE POLICY sprint_attempts_insert_own
      ON public.sprint_question_attempts
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- 7. Grant permissions
GRANT ALL ON public.sprint_sessions TO authenticated;
GRANT ALL ON public.sprint_question_attempts TO authenticated;

-- 8. Notify PostgREST to reload schema
DO $$ 
BEGIN 
  PERFORM pg_notify('pgrst', 'reload schema'); 
EXCEPTION 
  WHEN OTHERS THEN NULL; 
END $$;
