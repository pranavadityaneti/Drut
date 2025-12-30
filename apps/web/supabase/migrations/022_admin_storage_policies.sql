-- Migration: 022_admin_storage_policies.sql
-- Purpose: Ensure authenticated users (admins) can Upload, View, and DELETE textbooks.

-- 1. Ensure 'textbooks' bucket exists (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('textbooks', 'textbooks', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to avoid conflicts (clean slate for this bucket)
DROP POLICY IF EXISTS "Textbook Insert" ON storage.objects;
DROP POLICY IF EXISTS "Textbook Select" ON storage.objects;
DROP POLICY IF EXISTS "Textbook Delete" ON storage.objects;

-- 3. Create Policies

-- INSERT: Authenticated users can upload
CREATE POLICY "Textbook Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'textbooks' );

-- SELECT: Authenticated users can view/download
CREATE POLICY "Textbook Select"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'textbooks' );

-- DELETE: Authenticated users can delete
CREATE POLICY "Textbook Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'textbooks' );

-- Update bucket to public just in case
UPDATE storage.buckets SET public = true WHERE id = 'textbooks';
