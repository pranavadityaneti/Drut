-- ============================================================
-- Migration 041: class_level column + OpenAI-pipeline trust values
-- ------------------------------------------------------------
-- Supports the new OpenAI (gpt-5.4-mini) question-generation pipeline.
--
--   1. Add cached_questions.class_level — Intermediate year (1st = Class 11,
--      2nd = Class 12). Today the year is only derived at runtime from
--      examSyllabusConfig whitelists; generated questions should carry it
--      explicitly so we can filter cleanly later. Nullable for legacy rows.
--
--   2. Document the two verification_status values the pipeline uses
--      (no DDL needed — verification_status is a free-text column):
--        'ai-openai-staged'  -> generated + self-audited, AWAITING admin review.
--                               Deliberately NOT in any client trust gate, so
--                               staged questions are NEVER served to users.
--        'ai-openai-audited' -> admin-approved; trusted and served. Added to the
--                               web filter (NewPractice) and mobile trust list.
--      Admin "approve" simply flips 'ai-openai-staged' -> 'ai-openai-audited'.
--
-- NOTE: serving still filters by exam_profile/topic/subtopic/difficulty via
--       get_unseen_questions. Adding a subject + class_level filter to that RPC
--       is a separate, coordinated change (practice_scope wiring, forlater #1)
--       and is intentionally NOT done here.
--
-- Safe + idempotent: additive column, no data rewrite.
-- ============================================================

ALTER TABLE public.cached_questions
  ADD COLUMN IF NOT EXISTS class_level TEXT;

COMMENT ON COLUMN public.cached_questions.class_level IS
  'Intermediate year: ''11'' (1st year) or ''12'' (2nd year). Populated by the OpenAI generation pipeline; nullable for legacy rows.';

-- Cheap, harmless index to prepare for future class_level filtering.
CREATE INDEX IF NOT EXISTS idx_cached_questions_class_level
  ON public.cached_questions (class_level);

-- Reload PostgREST schema cache so the new column is visible to the API.
NOTIFY pgrst, 'reload schema';
