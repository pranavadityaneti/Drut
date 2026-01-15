-- Migration: 023_admin_rag_filtering.sql
-- Purpose: Update RAG search function to support filtering by 'class_level'
-- This ensures Class 11 questions ONLY come from Class 11 books.

-- 1. Drop existing function to avoid overloading ambiguity
DROP FUNCTION IF EXISTS public.match_syllabus_content(vector, float, int, text, text);

-- 2. Create updated function with 'filter_class_level' argument
CREATE OR REPLACE FUNCTION public.match_syllabus_content(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_subject text DEFAULT NULL,
  filter_board text DEFAULT NULL,
  filter_class_level text DEFAULT NULL -- NEW: For strict isolation
)
RETURNS TABLE (
  id uuid,
  content text,
  textbook_title text,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    chunk.id,
    chunk.content,
    tb.title as textbook_title,
    1 - (chunk.embedding <=> query_embedding) as similarity
  FROM public.textbook_chunks chunk
  JOIN public.textbooks tb ON chunk.textbook_id = tb.id
  WHERE 1 - (chunk.embedding <=> query_embedding) > match_threshold
  -- Apply strict filters if provided
  AND (filter_subject IS NULL OR tb.subject = filter_subject)
  AND (filter_board IS NULL OR tb.board = filter_board)
  AND (filter_class_level IS NULL OR tb.class_level = filter_class_level) -- Strict Class Check
  ORDER BY chunk.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 3. Grant Execute permission
GRANT EXECUTE ON FUNCTION public.match_syllabus_content(vector, float, int, text, text, text) TO authenticated;

-- 4. Notify to reload schema
NOTIFY pgrst, 'reload schema';
