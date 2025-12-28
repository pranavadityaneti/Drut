-- ============================================================
-- Migration: Add Variant Support to Cached Questions
-- Purpose: Enable master/variant relationship for bulk-ingested questions
-- ============================================================

-- Add parent_question_id column for variant tracking
-- Master questions have NULL, variants reference their parent
ALTER TABLE public.cached_questions 
  ADD COLUMN IF NOT EXISTS parent_question_id UUID REFERENCES public.cached_questions(id) ON DELETE CASCADE;

-- Add variant_number for ordering (1, 2, 3 for variants)
ALTER TABLE public.cached_questions 
  ADD COLUMN IF NOT EXISTS variant_number INTEGER;

-- Add constraint: variant_number only set when parent_question_id is set
ALTER TABLE public.cached_questions 
  ADD CONSTRAINT check_variant_consistency 
  CHECK (
    (parent_question_id IS NULL AND variant_number IS NULL) OR
    (parent_question_id IS NOT NULL AND variant_number IS NOT NULL)
  );

-- Index for fast variant lookups
CREATE INDEX IF NOT EXISTS idx_cached_questions_parent 
  ON public.cached_questions(parent_question_id) 
  WHERE parent_question_id IS NOT NULL;

-- Add source column to track origin (manual, csv, ai-generated)
ALTER TABLE public.cached_questions 
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- ============================================================
-- Helper Functions
-- ============================================================

-- Get all variants for a master question
CREATE OR REPLACE FUNCTION get_variants(master_id UUID)
RETURNS SETOF public.cached_questions
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM public.cached_questions 
  WHERE parent_question_id = master_id
  ORDER BY variant_number;
$$;

-- Get master question for a variant
CREATE OR REPLACE FUNCTION get_master(variant_id UUID)
RETURNS public.cached_questions
LANGUAGE sql
STABLE
AS $$
  SELECT m.* FROM public.cached_questions m
  JOIN public.cached_questions v ON v.parent_question_id = m.id
  WHERE v.id = variant_id;
$$;

-- Count variants for a master
CREATE OR REPLACE FUNCTION count_variants(master_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER FROM public.cached_questions 
  WHERE parent_question_id = master_id;
$$;
