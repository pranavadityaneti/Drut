-- ============================================================
-- Migration 042: scoped UPDATE policy for AI-review (approve/reject)
-- ------------------------------------------------------------
-- cached_questions currently has only SELECT (read_all) + INSERT (insert_auth)
-- RLS policies, so an authenticated UPDATE is blocked. The admin "AI Review"
-- tab needs to flip OpenAI-pipeline questions between:
--   'ai-openai-staged'  -> 'ai-openai-audited'  (approve; becomes served)
--   'ai-openai-staged'  -> 'ai-openai-rejected' (reject; stays unserved)
--
-- This policy permits authenticated UPDATEs ONLY on rows whose
-- verification_status is in the 'ai-openai-*' family — both before (USING) and
-- after (WITH CHECK). It cannot touch PYQ / admin-verified / manual / RAG / any
-- other question in the bank. The admin tab is the only UI surface that uses it.
--
-- Beta-scoped trade-off: any authenticated user could (via the REST API) flip an
-- ai-openai-* row, but only those rows — and they are already audit-gated. Harden
-- post-beta with a DB-level admin check or a service-role edge function
-- (tracked in forlater alongside #48 admin enforcement).
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cached_questions'
      AND policyname = 'cached_questions_update_ai_review'
  ) THEN
    CREATE POLICY cached_questions_update_ai_review
      ON public.cached_questions
      FOR UPDATE
      TO authenticated
      USING (verification_status LIKE 'ai-openai-%')
      WITH CHECK (verification_status LIKE 'ai-openai-%');
  END IF;
END$$;

NOTIFY pgrst, 'reload schema';
