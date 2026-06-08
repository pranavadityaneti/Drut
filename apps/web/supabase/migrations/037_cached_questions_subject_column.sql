-- Migration 037: Add explicit `subject` column to cached_questions
--
-- Context (2026-06-07):
--   Subject was previously implicit — derived from chapter (topic) name via
--   a knowledge_nodes parent walk. This is fragile because chapter titles
--   can collide across subjects (e.g., "Vectors" exists in both Mathematics
--   and Physics under different parents). Making subject explicit lets:
--     - The cache query filter by subject directly
--     - The admin Bulk Import set subject explicitly at upload time
--     - Reports / audits group cleanly by subject
--
--   See `docs/practice-mode-architecture-v2.md` for the full rationale.
--
-- Three-step migration (apply in order, verify between steps):
--   Step 1: Add nullable column
--   Step 2: Backfill from knowledge_nodes parent walk
--   Step 3: Set NOT NULL (after verifying backfill is complete)
--
-- Recoverability:
--   Step 1 (ADD COLUMN): reversible via `DROP COLUMN subject` if needed.
--   Step 2 (UPDATE): updates ~7,100+ rows; one-time and idempotent.
--     Re-running is a no-op for already-backfilled rows.
--   Step 3 (SET NOT NULL): only run after manual verification that no rows
--     have NULL subject. If any row is NULL, step 3 will fail loudly —
--     that's the safety net.

-- ============================================================
-- STEP 1: Add nullable column
-- ============================================================

ALTER TABLE public.cached_questions
  ADD COLUMN IF NOT EXISTS subject text;

-- ============================================================
-- STEP 2: Backfill from knowledge_nodes parent walk
-- ============================================================
-- For each cached_questions row, find the matching topic node and walk up
-- to the subject node. Some rows may not match (legacy data with topic
-- names not in knowledge_nodes — those stay NULL and surface in the
-- verification check below).

UPDATE public.cached_questions cq
SET subject = (
  SELECT s.name
  FROM public.knowledge_nodes t
  JOIN public.knowledge_nodes s ON s.id = t.parent_id
  WHERE t.name = cq.topic
    AND t.node_type = 'topic'
    AND s.node_type = 'subject'
  LIMIT 1
)
WHERE subject IS NULL;

-- ============================================================
-- STEP 3 — Run separately after verifying step 2 result
-- ============================================================
-- Before running step 3, run the verification query at the bottom of
-- this file. It should show 0 rows with NULL subject. If non-zero,
-- investigate (legacy topics that don't match knowledge_nodes) and
-- decide whether to:
--   (a) backfill those rows manually (subject best-guess from exam_profile)
--   (b) delete those orphan rows (if they're stale)
--   (c) skip NOT NULL constraint for now (track in forlater)
--
-- Once 0 NULL rows confirmed, uncomment and run:
--
-- ALTER TABLE public.cached_questions ALTER COLUMN subject SET NOT NULL;

-- ============================================================
-- Verification queries (run after step 2, before step 3)
-- ============================================================

-- 1. How many rows are still NULL after backfill?
--    SELECT COUNT(*) FROM public.cached_questions WHERE subject IS NULL;
--    Expected: 0 if knowledge_nodes covers all cached topics.

-- 2. Distribution of subjects after backfill
--    SELECT subject, COUNT(*) FROM public.cached_questions
--    GROUP BY subject ORDER BY COUNT(*) DESC;
--    Expected: Mathematics, Physics, Chemistry, plus NULL if any.

-- 3. If NULL rows exist, see which topics didn't match
--    SELECT topic, COUNT(*) FROM public.cached_questions
--    WHERE subject IS NULL GROUP BY topic ORDER BY COUNT(*) DESC LIMIT 30;
