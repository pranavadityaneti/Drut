-- Migration: Add Pattern Mastery Stats RPC
-- Purpose: Get counts of verified and learning patterns for dashboard

CREATE OR REPLACE FUNCTION public.get_pattern_mastery_stats(p_user_id UUID)
RETURNS TABLE (
  verified_count BIGINT,
  learning_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE mastery_level = 'verified') as verified_count,
    COUNT(*) FILTER (WHERE mastery_level = 'learning') as learning_count
  FROM public.user_pattern_mastery
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions explicitly
GRANT EXECUTE ON FUNCTION public.get_pattern_mastery_stats TO authenticated;

-- Notify PostgREST to reload schema
DO $$ 
BEGIN 
  PERFORM pg_notify('pgrst', 'reload schema'); 
EXCEPTION 
  WHEN OTHERS THEN NULL; 
END $$;
