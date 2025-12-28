-- ============================================================
-- Backfill Script: Add legacy pattern tag to existing questions
-- Purpose: Allow testing "Prove It" before AI generates proper fsmTags  
-- Run this in Supabase SQL Editor
-- ============================================================

-- Option 1: Set all existing questions to a legacy tag
UPDATE public.cached_questions 
SET fsm_tag = 'legacy-pattern'
WHERE fsm_tag IS NULL;

-- Option 2: Set based on subtopic (more specific)
-- UPDATE public.cached_questions 
-- SET fsm_tag = LOWER(REPLACE(subtopic, ' ', '-')) || '-legacy'
-- WHERE fsm_tag IS NULL;

-- Verify the update
SELECT 
  fsm_tag,
  COUNT(*) as question_count
FROM public.cached_questions
GROUP BY fsm_tag
ORDER BY question_count DESC;
