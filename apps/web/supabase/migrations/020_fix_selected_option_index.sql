-- ============================================================
-- Migration: Fix Missing Columns for Practice Mode
-- Purpose: Add selected_option_index to user_question_history if missing
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/<project-id>/sql
-- ============================================================

-- 1. Add selected_option_index to user_question_history (Practice Mode)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_question_history' 
    AND column_name = 'selected_option_index'
  ) THEN
    ALTER TABLE public.user_question_history 
    ADD COLUMN selected_option_index INTEGER;
    RAISE NOTICE 'Added selected_option_index to user_question_history';
  ELSE
    RAISE NOTICE 'Column selected_option_index already exists in user_question_history';
  END IF;
END $$;

-- 2. Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_question_history' 
AND column_name = 'selected_option_index';
