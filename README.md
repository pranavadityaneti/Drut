# Drut - AI Learning App

This document provides the necessary setup instructions for the Drut application's database and storage.

## Supabase Database Setup

The application requires a specific database schema to handle user accounts, persist practice attempts, and calculate analytics. The following SQL script will set up all necessary tables, security policies, and server-side functions. It is **idempotent**, meaning it is safe to run multiple times.

**IMPORTANT:** You must run this script in your Supabase project's SQL Editor to fix the application's persistence and analytics errors.

### How to Apply the Schema:

1.  Navigate to your Supabase project dashboard.
2.  In the left-hand menu, click on the **SQL Editor** icon.
3.  Click **+ New query**.
4.  Copy the entire SQL script below and paste it into the query window.
5.  Click the **RUN** button.

This will correctly initialize your database. After running the script, the application should function as expected.

### Full SQL Schema

```sql
-- Base table (safe if exists)
create table if not exists public.performance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  question_id text,
  is_correct boolean not null default false,
  time_ms integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.performance_records enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
    where schemaname='public' and tablename='performance_records' and policyname='read_own') then
    create policy read_own on public.performance_records for select
      using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies
    where schemaname='public' and tablename='performance_records' and policyname='insert_own') then
    create policy insert_own on public.performance_records for insert
      with check (user_id = auth.uid());
  end if;
end $$;

-- Clean old names (safe)
drop function if exists public.get_user_analytics();
drop function if exists public.drut_get_user_analytics_v1(uuid);

-- Versioned RPC (takes user id) - STABLE + SECURITY DEFINER
create or replace function public.drut_get_user_analytics_v1(p_user_id uuid)
returns table (
  total_attempts int,
  accuracy numeric,
  avg_time_ms numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select
      count(*)::int as total_attempts,
      coalesce(avg(is_correct::int),0)::numeric as accuracy,
      coalesce(avg(nullif(time_ms,0)),0)::numeric as avg_time_ms
    from public.performance_records
    where user_id = p_user_id
  )
  select total_attempts, accuracy, avg_time_ms from base;
$$;

-- No-arg wrapper (uses session user)
create or replace function public.get_user_analytics()
returns table (
  total_attempts int,
  accuracy numeric,
  avg_time_ms numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select * from public.drut_get_user_analytics_v1(auth.uid());
$$;

grant execute on function public.drut_get_user_analytics_v1(uuid) to anon, authenticated;
grant execute on function public.get_user_analytics()           to anon, authenticated;
```

## Supabase Storage Setup (for Avatars)

The user profile feature allows users to upload their own profile pictures. This requires a Supabase Storage bucket named `avatars`. If you are still seeing "Bucket not found" errors after creating the bucket, it is likely due to misconfigured security policies.

The `upsert` functionality used in the app requires permissions for **SELECT**, **INSERT**, and **UPDATE**.

### How to Set Up Bucket and Policies (Recommended Method)

The most reliable way to configure storage is to run the following SQL script in your Supabase project's **SQL Editor**. This will create the bucket (if it doesn't exist) and apply the correct, comprehensive security policies.

1.  Navigate to the **SQL Editor** in your Supabase dashboard.
2.  Click **+ New query**.
3.  Paste and **RUN** the script below.

```sql
-- Create the 'avatars' bucket if it doesn't exist.
-- The 'public' argument makes it a public bucket.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to ensure a clean setup.
-- Note: This is safe to run even if the policies don't exist.
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Updates" ON storage.objects;

-- 1. Create policy for public read access.
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'avatars' );

-- 2. Create policy for authenticated users to upload their own avatar.
-- This policy checks that the filename starts with the user's UID.
-- e.g., "f3a2b1c0-....jpg"
CREATE POLICY "Allow Authenticated Uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' AND auth.uid()::text = split_part(name, '.', 1) );

-- 3. Create policy for authenticated users to update their own avatar.
-- This policy ensures a user can only update a file that they own.
CREATE POLICY "Allow Authenticated Updates"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' AND auth.uid() = owner )
WITH CHECK ( auth.uid()::text = split_part(name, '.', 1) );
```