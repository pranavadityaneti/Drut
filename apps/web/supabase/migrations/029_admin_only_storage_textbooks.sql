-- Migration: 029_admin_only_storage_textbooks
--
-- Purpose: Restrict textbook bucket INSERT and DELETE to admin users only.
-- 022_admin_storage_policies.sql allowed ANY authenticated user (including
-- every beta-waitlist signup) to upload AND delete files in the textbooks
-- bucket. That meant a single rogue student could wipe every textbook PDF
-- from production storage.
--
-- This migration replaces those policies with admin-only versions that gate
-- on JWT email, matching the existing client-side admin identification:
--   apps/web/components/Sidebar.tsx  isAdmin check
--   apps/web/components/MobileNav.tsx isAdmin check
--
-- WHEN ADDING / CHANGING ADMINS: update all three locations (this file +
-- both client files) in the same PR. There is no central admin role table yet
-- (see forlater.md item — RBAC migration). If/when a `profiles.is_admin`
-- column or `app_metadata.role = 'admin'` claim is added, this migration's
-- successor should switch to that source of truth.
--
-- SELECT (read) remains open to authenticated users. RAG retrieves chunk
-- content from textbook_chunks, not from raw PDFs in storage, so locking
-- SELECT would only matter if students started downloading raw PDFs — they
-- don't, but leaving SELECT open also doesn't add risk and avoids breaking
-- any pre-flight inspect-PDF flow.

-- Drop the permissive INSERT + DELETE policies from 022.
DROP POLICY IF EXISTS "Textbook Insert" ON storage.objects;
DROP POLICY IF EXISTS "Textbook Delete" ON storage.objects;

-- Admin-only INSERT.
CREATE POLICY "Textbook Insert (admin-only)"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'textbooks'
    AND (auth.jwt() ->> 'email') IN (
        'pranav.n@ideaye.in',
        'pranav.n@drut.club'
    )
);

-- Admin-only DELETE.
CREATE POLICY "Textbook Delete (admin-only)"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'textbooks'
    AND (auth.jwt() ->> 'email') IN (
        'pranav.n@ideaye.in',
        'pranav.n@drut.club'
    )
);

-- The SELECT policy ("Textbook Select" from 022) is intentionally left in
-- place — any authenticated user can read PDFs. No change here.
