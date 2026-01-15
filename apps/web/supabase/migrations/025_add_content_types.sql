-- Migration: 025_add_content_types
-- Description: Add support for different content types and URLs

-- 1. Create Enum (if not exists, logic handled by treating as text or check constraint)
-- Using Check Constraint for flexibility
ALTER TABLE textbooks 
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'textbook' 
CHECK (content_type IN ('textbook', 'workbook', 'article', 'video', 'other'));

ALTER TABLE textbooks 
ADD COLUMN IF NOT EXISTS url TEXT;

ALTER TABLE textbooks 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Index for faster filtering by type
CREATE INDEX IF NOT EXISTS idx_textbooks_content_type ON textbooks(content_type);
