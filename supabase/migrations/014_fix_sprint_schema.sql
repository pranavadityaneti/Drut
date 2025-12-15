-- ============================================================
-- Migration: Fix Sprint Schema
-- Purpose: Add missing selected_option_index to sprint_question_attempts
-- ============================================================

-- Add selected_option_index column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sprint_question_attempts' 
    AND column_name = 'selected_option_index'
  ) THEN
    ALTER TABLE public.sprint_question_attempts 
    ADD COLUMN selected_option_index INTEGER;
  END IF;
END $$;

-- Notify PostgREST to reload schema
DO $$ 
BEGIN 
  PERFORM pg_notify('pgrst', 'reload schema'); 
EXCEPTION 
  WHEN OTHERS THEN NULL; 
END $$;
