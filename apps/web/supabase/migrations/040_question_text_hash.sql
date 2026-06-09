-- Migration 040: Add question_text_hash to cached_questions
--
-- Purpose:
--   Enable deterministic dedup of bulk-import batches. The admin Bulk
--   Import insert path (PR #4b edge function + #4c UI wiring) queries
--   this column to skip duplicates before insert. A UNIQUE index on
--   (question_text_hash, exam_profile) is the DB-side safety net for
--   races (e.g., two admins paste the same JSON simultaneously).
--
-- Hash strategy (must match the edge function and any client-side
-- precheck):
--   SHA-256 of LOWER(REGEXP_REPLACE(questionText, '\s+', ' ', 'g'))
--   i.e. lowercase + whitespace-collapsed.
--   Handles trivial typos and whitespace drift between batches without
--   conflating genuinely different questions.
--
-- Scope: index is (question_text_hash, exam_profile) NOT just
--   question_text_hash — the same question can legitimately exist for
--   multiple exam_profiles (e.g., ap_eapcet AND ts_eapcet).
--
-- Three-step migration (pattern matches migration 037):
--   Step 1: ADD COLUMN (nullable)
--   Step 2: Backfill from question_data->>'questionText'
--   Step 3 (deferred): CREATE UNIQUE INDEX (requires 0 duplicates)
--
-- Recoverability:
--   Step 1: DROP COLUMN question_text_hash
--   Step 2: UPDATE ... SET question_text_hash = NULL
--   Step 3: DROP INDEX idx_cached_questions_text_hash_exam

-- ============================================================
-- STEP 1: Add nullable column
-- ============================================================

ALTER TABLE public.cached_questions
  ADD COLUMN IF NOT EXISTS question_text_hash text;

-- ============================================================
-- STEP 2: Backfill from question_data->>'questionText'
-- ============================================================
-- pgcrypto's digest() is available on Supabase by default;
-- CREATE EXTENSION IF NOT EXISTS pgcrypto would be redundant but safe.
--
-- COALESCE handles rows where question_data has no questionText key
-- (legacy rows). Empty strings hash deterministically and cluster
-- together — step 3's pre-index verification will flag if that
-- clustering breaks the UNIQUE constraint.

UPDATE public.cached_questions
SET question_text_hash = encode(
  digest(
    LOWER(REGEXP_REPLACE(COALESCE(question_data->>'questionText', ''), '\s+', ' ', 'g')),
    'sha256'
  ),
  'hex'
)
WHERE question_text_hash IS NULL;

-- ============================================================
-- STEP 3 — Run AFTER verifying 0 duplicates
-- ============================================================
-- The UNIQUE INDEX cannot be created while any (hash, exam_profile)
-- duplicates exist in the table. The verification queries below check
-- for this. Run them, confirm both return 0, THEN uncomment and run
-- step 3.
--
-- If duplicates exist:
--   (a) Inspect the rows: same questionText AND same exam_profile —
--       these ARE genuine duplicates (legacy admin double-insert,
--       cache-warm re-run with overlapping seeds, etc.)
--   (b) Decide: keep the older row (lower generated_at), delete the
--       younger. Or vice versa.
--   (c) After cleanup, re-run step 3.
--
-- Once duplicates = 0:
--
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_cached_questions_text_hash_exam
--   ON public.cached_questions (question_text_hash, exam_profile);

-- ============================================================
-- Verification queries (run between step 2 and step 3)
-- ============================================================

-- 1. Backfill completeness — should be 0
--    SELECT COUNT(*) AS null_hash_rows
--    FROM public.cached_questions
--    WHERE question_text_hash IS NULL;

-- 2. Pre-index duplicate check — should be 0
--    SELECT COUNT(*) AS duplicate_groups FROM (
--      SELECT question_text_hash, exam_profile
--      FROM public.cached_questions
--      WHERE question_text_hash IS NOT NULL
--      GROUP BY question_text_hash, exam_profile
--      HAVING COUNT(*) > 1
--    ) dup;

-- 3. If duplicates exist, show the top 30 with row counts so you can
--    decide which to keep:
--    SELECT question_text_hash, exam_profile, COUNT(*) AS rows,
--           array_agg(id ORDER BY generated_at) AS ids
--    FROM public.cached_questions
--    WHERE question_text_hash IS NOT NULL
--    GROUP BY question_text_hash, exam_profile
--    HAVING COUNT(*) > 1
--    ORDER BY rows DESC
--    LIMIT 30;
