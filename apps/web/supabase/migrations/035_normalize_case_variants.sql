-- Migration 035: Normalize case-variant duplicate chapter titles
--
-- Context (2026-06-07):
--   Audit after migration 034 found 10 chapter titles where the same
--   chapter exists twice under the same subject parent — only the case
--   differs. Examples:
--     "Chapter 14: Probability" + "Chapter 14: PROBABILITY"
--     "Chapter 12: Kinetic theory" + "Chapter 12: Kinetic Theory"
--     "Chapter 2: Motion in a straight line" + "Chapter 2: Motion in a Straight Line"
--
--   Migration 033 deduped exact-case matches; migration 034 normalized
--   Unit→Chapter prefix. This migration finishes the dedup story by
--   normalizing each known pair to its Title Case canonical form.
--
-- Scope (deliberately narrow):
--   - ONLY the 10 confirmed pairs from the 2026-06-07 audit
--   - Does NOT touch singular/plural variants ("Measurement" vs
--     "Measurements", "System" vs "Systems") — those may be legitimate
--     textbook differences (older NCERT vs newer syllabus), not typos.
--     Track via forlater if dedup ever becomes desirable there.
--
-- Approach:
--   Explicit per-pair UPDATEs (rather than a regex/programmatic normalize).
--   Audit trail is clearer, blast radius is exactly the 10 known pairs,
--   no risk of mangling a chapter title we don't intend to touch.
--
-- Affected parents (per audit):
--   c3c93f83-b4db-4184-8a7e-ae618b04ab38  Mathematics, NCERT Class 12
--   5bf51a5e-7dbf-445f-b1a5-7db244c87b52  Physics, NCERT Class 11
--   6111635a-88ab-4cf3-9dc9-748e2e4c9634  Mathematics, NCERT Class 11
--
-- Recoverability:
--   Steps 1+2 (UPDATEs): the bad-case original is lost; recovery would
--     require a backup with the original strings restored row-by-row.
--   Step 3 (DELETE): destructive; up to 10 rows removed from
--     knowledge_nodes. Cached questions remain tied to surviving rows
--     via the renamed topic string (no FK cascade impact).
--
-- Applied: 2026-06-07 by Pranav via Supabase Studio SQL Editor.
-- This file is the audit-trail record of what was applied.

BEGIN;

-- ============================================================
-- knowledge_nodes — 10 explicit case renames (bad → Title Case)
-- ============================================================

UPDATE public.knowledge_nodes SET name = 'Chapter 1: Relations and Functions'
  WHERE node_type = 'topic' AND name = 'Chapter 1: RELATIONS AND FUNCTIONS';

UPDATE public.knowledge_nodes SET name = 'Chapter 1: Units and Measurements'
  WHERE node_type = 'topic' AND name = 'Chapter 1: Units and measurements';

UPDATE public.knowledge_nodes SET name = 'Chapter 10: Thermal Properties of Matter'
  WHERE node_type = 'topic' AND name = 'Chapter 10: Thermal Properties of matter';

UPDATE public.knowledge_nodes SET name = 'Chapter 12: Kinetic Theory'
  WHERE node_type = 'topic' AND name = 'Chapter 12: Kinetic theory';

UPDATE public.knowledge_nodes SET name = 'Chapter 14: Probability'
  WHERE node_type = 'topic' AND name = 'Chapter 14: PROBABILITY';

UPDATE public.knowledge_nodes SET name = 'Chapter 2: Motion in a Straight Line'
  WHERE node_type = 'topic' AND name = 'Chapter 2: Motion in a straight line';

UPDATE public.knowledge_nodes SET name = 'Chapter 5: Work, Energy and Power'
  WHERE node_type = 'topic' AND name = 'Chapter 5: Work, energy and Power';

UPDATE public.knowledge_nodes SET name = 'Chapter 6: System of Particles and Rotational Motion'
  WHERE node_type = 'topic' AND name = 'Chapter 6: System of Particles and rotational motion';

UPDATE public.knowledge_nodes SET name = 'Chapter 8: Mechanical Properties of Solids'
  WHERE node_type = 'topic' AND name = 'Chapter 8: Mechanical Properties of solids';

UPDATE public.knowledge_nodes SET name = 'Chapter 9: Straight Lines'
  WHERE node_type = 'topic' AND name = 'Chapter 9: STRAIGHT LINES';

-- ============================================================
-- cached_questions — same 10 renames on the topic column
-- ============================================================

UPDATE public.cached_questions SET topic = 'Chapter 1: Relations and Functions'
  WHERE topic = 'Chapter 1: RELATIONS AND FUNCTIONS';

UPDATE public.cached_questions SET topic = 'Chapter 1: Units and Measurements'
  WHERE topic = 'Chapter 1: Units and measurements';

UPDATE public.cached_questions SET topic = 'Chapter 10: Thermal Properties of Matter'
  WHERE topic = 'Chapter 10: Thermal Properties of matter';

UPDATE public.cached_questions SET topic = 'Chapter 12: Kinetic Theory'
  WHERE topic = 'Chapter 12: Kinetic theory';

UPDATE public.cached_questions SET topic = 'Chapter 14: Probability'
  WHERE topic = 'Chapter 14: PROBABILITY';

UPDATE public.cached_questions SET topic = 'Chapter 2: Motion in a Straight Line'
  WHERE topic = 'Chapter 2: Motion in a straight line';

UPDATE public.cached_questions SET topic = 'Chapter 5: Work, Energy and Power'
  WHERE topic = 'Chapter 5: Work, energy and Power';

UPDATE public.cached_questions SET topic = 'Chapter 6: System of Particles and Rotational Motion'
  WHERE topic = 'Chapter 6: System of Particles and rotational motion';

UPDATE public.cached_questions SET topic = 'Chapter 8: Mechanical Properties of Solids'
  WHERE topic = 'Chapter 8: Mechanical Properties of solids';

UPDATE public.cached_questions SET topic = 'Chapter 9: Straight Lines'
  WHERE topic = 'Chapter 9: STRAIGHT LINES';

-- ============================================================
-- Step 3: Dedup knowledge_nodes — same shape as migrations 033 + 034
-- (keep oldest per parent_id + name)
-- ============================================================

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

-- Verification queries (run after applying — should all return 0):
--   SELECT COUNT(*) FROM public.knowledge_nodes
--     WHERE name IN (
--       'Chapter 1: RELATIONS AND FUNCTIONS',
--       'Chapter 1: Units and measurements',
--       'Chapter 10: Thermal Properties of matter',
--       'Chapter 12: Kinetic theory',
--       'Chapter 14: PROBABILITY',
--       'Chapter 2: Motion in a straight line',
--       'Chapter 5: Work, energy and Power',
--       'Chapter 6: System of Particles and rotational motion',
--       'Chapter 8: Mechanical Properties of solids',
--       'Chapter 9: STRAIGHT LINES'
--     );
--
--   SELECT parent_id, name, COUNT(*) FROM public.knowledge_nodes
--     WHERE node_type = 'topic'
--     GROUP BY parent_id, name HAVING COUNT(*) > 1;
