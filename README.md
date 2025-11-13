
# Drut - AI Learning App

This document provides the necessary setup instructions for the Drut application's database and storage.

## ⚠️ Critical Setup Instructions

To ensure the application functions correctly, you **must** configure your Supabase backend by running the SQL script provided below. Failure to do so will result in errors related to saving progress and loading analytics.

## Supabase Database Setup

The application requires a specific database schema to handle user accounts, persist practice attempts, and calculate analytics. The following SQL script will set up all necessary tables, security policies, and server-side functions. It is **idempotent**, meaning it is safe to run multiple times.

### How to Apply the Schema:

1.  Navigate to your Supabase project dashboard.
2.  In the left-hand menu, click on the **SQL Editor** icon.
3.  Click **+ New query**.
4.  Copy the entire **"Full SQL Schema"** script below and paste it into the query window.
5.  Click the **RUN** button.
6.  **This step is crucial:** Go to **Settings** -> **API** and click the **Reload** button under "Schema Cache" to ensure your changes are visible to the application's API.

This will correctly initialize your database. After running the script and reloading the cache, the application should function as expected.

### Troubleshooting Common Errors

#### Error: "Could not find the table 'public.performance_records' in the schema cache" (Code: PGRST205)

**Why this happens:** This error occurs when the Supabase API layer (PostgREST) does not have permission to access the `performance_records` table. Even if the table exists in your database, the API cannot "see" it without the correct privileges being granted.

**Solution:** The "Full SQL Schema" script below is the definitive fix. It contains `GRANT` statements that explicitly give the necessary permissions to the API.
1.  Carefully follow the "How to Apply the Schema" steps above.
2.  Ensure you have run the **entire** script successfully.
3.  **Do not skip step #6 (Reloading the schema cache).** This is the most common reason the fix doesn't appear to work.

#### Error: "Could not find the function public.log_performance_v1(...) in the schema cache" (Code: PGRST202)

**Why this happens:** This is a similar issue, but for a server-side function instead of a table. It can be caused by missing execute permissions or a mismatch between the function signature in the database and what the application is calling.

**Solution:** The script below also fixes this by recreating the function with the correct parameter order and granting the necessary execute permissions. The solution is the same: run the full script and reload the schema cache.


### Full SQL Schema

```sql
-- 0. Add required extensions
create extension if not exists pgcrypto with schema extensions;

-- 1. Create the performance_records table, RLS policies, and grant privileges.
create table if not exists public.performance_records (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null,
  question_id text not null,
  is_correct boolean not null default false,
  time_ms integer not null default 0,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_perf_user on public.performance_records(user_id);
create index if not exists idx_perf_created on public.performance_records(created_at desc);

-- Enable Row Level Security
alter table public.performance_records enable row level security;

-- Drop old policies if names clash (safe if absent)
drop policy if exists read_own on public.performance_records;
drop policy if exists insert_own on public.performance_records;

-- Create policies to allow users to access their own records
create policy read_own on public.performance_records
for select using (user_id = auth.uid());

create policy insert_own on public.performance_records
for insert with check (coalesce(new.user_id, auth.uid()) = auth.uid());


-- Grant privileges for REST API access (THE FIX for "table not found")
grant usage on schema public to anon, authenticated;
grant select, insert on public.performance_records to anon, authenticated;


-- 2. Create the analytics RPC functions.
drop function if exists public.get_user_analytics();
drop function if exists public.drut_get_user_analytics_v1(uuid);

create or replace function public.drut_get_user_analytics_v1(p_user_id uuid)
returns table (
  total_attempts int,
  accuracy numeric,
  avg_time_ms numeric
)
language sql stable security definer set search_path = public
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

create or replace function public.get_user_analytics()
returns table (
  total_attempts int,
  accuracy numeric,
  avg_time_ms numeric
)
language sql stable security definer set search_path = public
as $$
  select * from public.drut_get_user_analytics_v1(auth.uid());
$$;

grant execute on function public.drut_get_user_analytics_v1(uuid) to anon, authenticated;
grant execute on function public.get_user_analytics() to anon, authenticated;


-- 3. Create a safe server function to log performance attempts (with a bulletproof JSON wrapper).
-- Clean up old conflicting versions (safe if they don't exist)
drop function if exists public.log_performance_v1(boolean, text, integer);
drop function if exists public.log_performance_v1(text, boolean, integer);
drop function if exists public.log_performance_v1_json(jsonb);


-- Canonical RPC with ALPHABETICAL parameter order to match PostgREST's lookup.
create or replace function public.log_performance_v1(
  p_is_correct  boolean,
  p_question_id text,
  p_time_ms     integer
)
returns public.performance_records
language plpgsql security definer set search_path = public, extensions stable
as $$
declare
  rec public.performance_records;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.performance_records(user_id, question_id, is_correct, time_ms)
  values (auth.uid(), p_question_id, p_is_correct, p_time_ms)
  returning * into rec;

  return rec;
end
$$;

-- JSON wrapper (this is the one the client should call for maximum resilience)
create or replace function public.log_performance_v1_json(payload jsonb)
returns public.performance_records
language sql security definer set search_path = public stable
as $$
  select public.log_performance_v1(
    (payload->>'p_is_correct')::boolean,
    (payload->>'p_question_id')::text,
    (payload->>'p_time_ms')::int
  );
$$;

grant execute on function public.log_performance_v1(boolean, text, integer) to anon, authenticated;
grant execute on function public.log_performance_v1_json(jsonb) to anon, authenticated;
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