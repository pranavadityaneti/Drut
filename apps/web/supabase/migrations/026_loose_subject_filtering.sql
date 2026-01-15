-- Migration: 026_loose_subject_filtering
-- Description: Update RAG matching to include 'General'/'PYQ' subjects in all queries.
-- NOTE: Class Filtering remains STRICT (Class 11 sees Class 11).

CREATE OR REPLACE FUNCTION public.match_syllabus_content(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_subject text DEFAULT NULL,
  filter_board text DEFAULT NULL,
  filter_class_level text DEFAULT NULL
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
  
  -- Board Constraint: Strict
  AND (filter_board IS NULL OR tb.board = filter_board)

  -- Class Constraint: Strict
  -- (We do NOT allow cross-class pollution for PYQs)
  AND (filter_class_level IS NULL OR tb.class_level = filter_class_level) 
  
  -- Subject Constraint: Match Exact OR Match 'Universal' categories
  AND (
      filter_subject IS NULL 
      OR tb.subject = filter_subject 
      OR tb.subject ILIKE 'General'
      OR tb.subject ILIKE 'All'
      OR tb.subject ILIKE 'PYQ%'
      OR tb.subject ILIKE 'Previous%'
      OR tb.subject ILIKE 'Mock%'
  )
  ORDER BY chunk.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
