-- ============================================================
-- Migration: Explanation Caching & RPC
-- Purpose: Create table for explanations and RPC to populate it
--          from existing question data.
-- ============================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.question_explanations (
    question_id UUID PRIMARY KEY REFERENCES public.cached_questions(id) ON DELETE CASCADE,
    fast_md TEXT,
    full_md TEXT,
    fast_safe BOOLEAN,
    risk_shortcut INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending', -- 'pending', 'ready', 'failed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.question_explanations ENABLE ROW LEVEL SECURITY;

-- 3. Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'question_explanations' 
        AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access" ON public.question_explanations
            FOR SELECT USING (true);
    END IF;
END$$;

-- 4. RPC Function to Get or Enqueue (Auto-generate from JSON)
CREATE OR REPLACE FUNCTION public.drut_get_or_enqueue_expl_v1(p_question_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_qdata JSONB;
    v_fast_md TEXT;
    v_full_md TEXT;
    v_fast_safe BOOLEAN;
BEGIN
    -- Check if exists
    IF EXISTS (SELECT 1 FROM public.question_explanations WHERE question_id = p_question_id) THEN
        RETURN;
    END IF;

    -- Fetch question data
    SELECT question_data INTO v_qdata
    FROM public.cached_questions
    WHERE id = p_question_id;

    IF v_qdata IS NULL THEN
        RETURN; -- Question not found
    END IF;

    -- Extract Full Solution
    -- Note: jsonb_array_elements_text requires a JSON array. We assume schema validity.
    SELECT string_agg(value, E'\n\n') INTO v_full_md
    FROM jsonb_array_elements_text(v_qdata->'fullStepByStep'->'steps');

    -- Extract Fast Method
    v_fast_safe := (v_qdata->'fastestSafeMethod'->>'exists')::boolean;
    
    SELECT string_agg('- ' || value, E'\n') INTO v_fast_md
    FROM jsonb_array_elements_text(v_qdata->'fastestSafeMethod'->'steps');
    
    -- Add preconditions
    IF v_qdata->'fastestSafeMethod'->>'preconditions' IS NOT NULL AND (v_qdata->'fastestSafeMethod'->>'preconditions') <> '' THEN
        v_fast_md := '**Preconditions:** ' || (v_qdata->'fastestSafeMethod'->>'preconditions') || E'\n\n**Steps:**\n' || v_fast_md;
    ELSE
        v_fast_md := '**Steps:**\n' || v_fast_md;
    END IF;

    -- Add sanity check
    IF v_qdata->'fastestSafeMethod'->>'sanityCheck' IS NOT NULL AND (v_qdata->'fastestSafeMethod'->>'sanityCheck') <> '' THEN
        v_fast_md := v_fast_md || E'\n\n**Sanity Check:** ' || (v_qdata->'fastestSafeMethod'->>'sanityCheck');
    END IF;

    -- Insert as READY immediately
    INSERT INTO public.question_explanations (question_id, fast_md, full_md, fast_safe, status)
    VALUES (p_question_id, v_fast_md, v_full_md, v_fast_safe, 'ready')
    ON CONFLICT (question_id) DO NOTHING;

END;
$$;

-- 5. Notify PostgREST
DO $$ 
BEGIN 
  PERFORM pg_notify('pgrst', 'reload schema'); 
EXCEPTION 
  WHEN OTHERS THEN NULL; 
END $$;
