-- Migration: 030_clean_knowledge_hierarchy
--
-- Purpose: Wipe the legacy knowledge_nodes hierarchy (one broken board
-- conflating board with exam name, plus children with wrong-case board/subject
-- metadata) and replace it with a clean tree containing the three boards
-- Pranav actually wants to support:
--   - NCERT  (national)
--   - BIEAP  (Andhra Pradesh state board)
--   - TSBIE  (Telangana state board)
--
-- Each board has Class 11 + Class 12 (NCERT) or 1st Year + 2nd Year (BIEAP
-- and TSBIE — state-board terminology Pranav chose 2026-06-05). Each class
-- has Mathematics, Physics, Chemistry subject folders.
--
-- Subject node metadata stores all three keys (board + class_level + subject)
-- so the updated ingest-textbook function can find the right parent when
-- inserting chapter knowledge_nodes — eliminating the orphan-at-root bug.
--
-- Chapter folders are NOT pre-created. They auto-populate during PDF ingestion
-- via the AI Table-of-Contents extractor in ingest-textbook (lines 64-200).
--
-- Atomic: the whole thing runs as one transaction. If any insert fails the
-- old hierarchy is preserved. Only when the DO block completes successfully
-- does the old 'Andhra Pradesh EAPCET' board get deleted (CASCADE wipes its
-- 9 children automatically).
--
-- Applied on production via Supabase Management API on 2026-06-05.
-- This file exists so a fresh `supabase db push` recreates the same state.

DO $$
DECLARE
    v_ncert_id        uuid;
    v_ncert_c11_id    uuid;
    v_ncert_c12_id    uuid;
    v_bieap_id        uuid;
    v_bieap_y1_id     uuid;
    v_bieap_y2_id     uuid;
    v_tsbie_id        uuid;
    v_tsbie_y1_id     uuid;
    v_tsbie_y2_id     uuid;
BEGIN
    -- =================================================================
    -- NCERT (national, "Class 11" / "Class 12" naming)
    -- =================================================================
    INSERT INTO public.knowledge_nodes (parent_id, name, node_type, metadata)
    VALUES (NULL, 'NCERT', 'board', '{"board":"NCERT"}'::jsonb)
    RETURNING id INTO v_ncert_id;

    INSERT INTO public.knowledge_nodes (parent_id, name, node_type, metadata)
    VALUES (v_ncert_id, 'Class 11', 'class', '{"class_level":"11"}'::jsonb)
    RETURNING id INTO v_ncert_c11_id;

    INSERT INTO public.knowledge_nodes (parent_id, name, node_type, metadata)
    VALUES (v_ncert_id, 'Class 12', 'class', '{"class_level":"12"}'::jsonb)
    RETURNING id INTO v_ncert_c12_id;

    INSERT INTO public.knowledge_nodes (parent_id, name, node_type, metadata)
    SELECT v_ncert_c11_id, subj, 'subject',
           jsonb_build_object('subject', subj, 'board', 'NCERT', 'class_level', '11')
    FROM unnest(ARRAY['Mathematics','Physics','Chemistry']) AS subj;

    INSERT INTO public.knowledge_nodes (parent_id, name, node_type, metadata)
    SELECT v_ncert_c12_id, subj, 'subject',
           jsonb_build_object('subject', subj, 'board', 'NCERT', 'class_level', '12')
    FROM unnest(ARRAY['Mathematics','Physics','Chemistry']) AS subj;

    -- =================================================================
    -- BIEAP (Andhra Pradesh, "1st Year" / "2nd Year" state-board naming)
    -- =================================================================
    INSERT INTO public.knowledge_nodes (parent_id, name, node_type, metadata)
    VALUES (NULL, 'BIEAP', 'board', '{"board":"BIEAP"}'::jsonb)
    RETURNING id INTO v_bieap_id;

    INSERT INTO public.knowledge_nodes (parent_id, name, node_type, metadata)
    VALUES (v_bieap_id, '1st Year', 'class', '{"class_level":"11"}'::jsonb)
    RETURNING id INTO v_bieap_y1_id;

    INSERT INTO public.knowledge_nodes (parent_id, name, node_type, metadata)
    VALUES (v_bieap_id, '2nd Year', 'class', '{"class_level":"12"}'::jsonb)
    RETURNING id INTO v_bieap_y2_id;

    INSERT INTO public.knowledge_nodes (parent_id, name, node_type, metadata)
    SELECT v_bieap_y1_id, subj, 'subject',
           jsonb_build_object('subject', subj, 'board', 'BIEAP', 'class_level', '11')
    FROM unnest(ARRAY['Mathematics','Physics','Chemistry']) AS subj;

    INSERT INTO public.knowledge_nodes (parent_id, name, node_type, metadata)
    SELECT v_bieap_y2_id, subj, 'subject',
           jsonb_build_object('subject', subj, 'board', 'BIEAP', 'class_level', '12')
    FROM unnest(ARRAY['Mathematics','Physics','Chemistry']) AS subj;

    -- =================================================================
    -- TSBIE (Telangana, "1st Year" / "2nd Year" state-board naming)
    -- Created empty/ready — Pranav has some TG textbooks already and is
    -- sourcing the rest.
    -- =================================================================
    INSERT INTO public.knowledge_nodes (parent_id, name, node_type, metadata)
    VALUES (NULL, 'TSBIE', 'board', '{"board":"TSBIE"}'::jsonb)
    RETURNING id INTO v_tsbie_id;

    INSERT INTO public.knowledge_nodes (parent_id, name, node_type, metadata)
    VALUES (v_tsbie_id, '1st Year', 'class', '{"class_level":"11"}'::jsonb)
    RETURNING id INTO v_tsbie_y1_id;

    INSERT INTO public.knowledge_nodes (parent_id, name, node_type, metadata)
    VALUES (v_tsbie_id, '2nd Year', 'class', '{"class_level":"12"}'::jsonb)
    RETURNING id INTO v_tsbie_y2_id;

    INSERT INTO public.knowledge_nodes (parent_id, name, node_type, metadata)
    SELECT v_tsbie_y1_id, subj, 'subject',
           jsonb_build_object('subject', subj, 'board', 'TSBIE', 'class_level', '11')
    FROM unnest(ARRAY['Mathematics','Physics','Chemistry']) AS subj;

    INSERT INTO public.knowledge_nodes (parent_id, name, node_type, metadata)
    SELECT v_tsbie_y2_id, subj, 'subject',
           jsonb_build_object('subject', subj, 'board', 'TSBIE', 'class_level', '12')
    FROM unnest(ARRAY['Mathematics','Physics','Chemistry']) AS subj;

    -- =================================================================
    -- Delete the legacy 'Andhra Pradesh EAPCET' board (and its 9 children
    -- via ON DELETE CASCADE on parent_id). Only runs if all the inserts
    -- above succeeded — otherwise the transaction rolls back and the old
    -- hierarchy is preserved.
    --
    -- The legacy board's id was captured during the 2026-06-05 audit:
    --   3979b6d1-9054-4d4b-8ce7-7129a393856f
    -- If for some reason it has a different id at apply time, this DELETE
    -- becomes a no-op and the operator must clean up manually.
    -- =================================================================
    DELETE FROM public.knowledge_nodes
     WHERE id = '3979b6d1-9054-4d4b-8ce7-7129a393856f'
        OR (node_type = 'board' AND metadata->>'board' = 'Ncert');
END $$;
