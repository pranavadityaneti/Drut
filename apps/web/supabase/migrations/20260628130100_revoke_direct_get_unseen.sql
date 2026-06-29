-- Close the raw-API bypass for count-on-serve.
--
-- ⚠️ ORDERING: apply this ONLY AFTER the count-on-serve client (which calls
-- serve_unseen_questions instead of get_unseen_questions) is live in PRODUCTION.
-- Until then, the prod web/mobile clients still call get_unseen_questions directly,
-- and revoking it here would break all question-serving in production.
--
-- After this, get_unseen_questions is no longer client-callable; the only
-- client-callable serving function is serve_unseen_questions, which meters on serve.
-- SECURITY DEFINER functions (serve_unseen_questions) can still call it internally.

revoke execute on function public.get_unseen_questions(uuid, text, text, text, integer) from authenticated;
revoke execute on function public.get_unseen_questions(uuid, text, text, text, text, integer) from authenticated;
