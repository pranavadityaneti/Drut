-- Migration 034: Normalize "Unit N:" → "Chapter N:" prefix
--
-- Context (2026-06-07):
--   Practice setup dropdown showed both "Unit 7: Redox Reactions" and
--   "Chapter 7: Redox Reactions" — same chapter ingested from different
--   textbook PDFs (NCERT used "Chapter", TSBIE used "Unit"). Confusing
--   for students; fragmented the cached question pool per concept.
--
-- Pre-flight audit found:
--   - 11 knowledge_nodes with "Unit N:" prefix (all Chemistry topic nodes)
--   - 6 of those would collide with existing "Chapter N:" siblings after
--     rename (all under Class 11 Chemistry parent)
--   - 5 unique Unit→Chapter renames in Class 12 Chemistry (no collision)
--   - 444 cached_questions rows to rename across 10 distinct topics
--   - 1 chapter (Hydrocarbons) merges question content from two sources
--     into a single 68-row pool
--
-- Migration steps (atomic via BEGIN/COMMIT):
--   1. Rename Unit N → Chapter N in knowledge_nodes
--   2. Rename Unit N → Chapter N in cached_questions.topic
--   3. Dedupe knowledge_nodes (keep oldest per parent_id + name;
--      same pattern as migration 033)
--
-- Recoverability:
--   Steps 1+2 (UPDATE): the original "Unit" prefix is lost unless restored
--     from a DB backup. Direct revert would require knowing which specific
--     rows had "Unit" originally (the 11 enumerated in the audit).
--   Step 3 (DELETE): destructive; 6 rows removed from knowledge_nodes.
--     Cached questions remain tied to the surviving "Chapter N:" nodes
--     via the renamed topic string — no FK cascade impact.
--
-- Applied: 2026-06-07 by Pranav via Supabase Studio SQL Editor.
-- This file is the audit-trail record of what was applied; the actual
-- DB change was made manually before this file was committed.

BEGIN;

-- Step 1: Rename in knowledge_nodes (11 rows expected)
UPDATE public.knowledge_nodes
SET name = REGEXP_REPLACE(name, '^Unit (\d+):', 'Chapter \1:')
WHERE name ~ '^Unit \d+:';

-- Step 2: Rename in cached_questions (444 rows expected)
UPDATE public.cached_questions
SET topic = REGEXP_REPLACE(topic, '^Unit (\d+):', 'Chapter \1:')
WHERE topic ~ '^Unit \d+:';

-- Step 3: Dedupe knowledge_nodes — keep oldest per (parent_id, name)
WITH dups AS (
  SELECT id, parent_id, name,
         ROW_NUMBER() OVER (
           PARTITION BY parent_id, name
           ORDER BY created_at, id
         ) AS rn
  FROM public.knowledge_nodes
  WHERE node_type = 'topic' AND parent_id IS NOT NULL
)
DELETE FROM public.knowledge_nodes
WHERE id IN (SELECT id FROM dups WHERE rn > 1);

COMMIT;

-- Verification queries (run manually after applying — should all return 0):
--   SELECT COUNT(*) FROM public.knowledge_nodes WHERE name ~ '^Unit \d+:';
--   SELECT COUNT(*) FROM public.cached_questions WHERE topic ~ '^Unit \d+:';
--   SELECT parent_id, name, COUNT(*)
--     FROM public.knowledge_nodes
--     WHERE node_type = 'topic'
--     GROUP BY parent_id, name HAVING COUNT(*) > 1;
