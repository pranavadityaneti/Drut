
# Drut - AI Learning App

This document provides the necessary setup instructions for the Drut application's database and storage.

> [!CAUTION]
> **CRITICAL SETUP REQUIRED**
> 
> The application **will not function** without the correct database setup. The errors "Could not find function in schema cache" are a direct result of not completing the steps below.
> 
> 1.  **Run the Full SQL Schema** in your Supabase SQL Editor.
> 2.  The script now attempts to reload the schema automatically. If you still have issues, **manually refresh the Schema Cache** via the API page in your Supabase dashboard.

## Supabase Database Setup

The application requires a specific database schema to handle user accounts, persist practice attempts, and calculate analytics. The following SQL script will set up all necessary tables, security policies, and server-side functions. It is **idempotent**, meaning it is safe to run multiple times.

### How to Apply the Schema:

1.  Navigate to your Supabase project dashboard.
2.  In the left-hand menu, click on the **SQL Editor** icon.
3.  Click **+ New query**.
4.  Copy the entire **"Full SQL Schema"** script below and paste it into the query window.
5.  Click the **RUN** button. You should see a "Success. No rows returned" message.
6.  The script automatically notifies the API to reload the schema. If you still encounter errors, go to the **API** page and manually click the "Reload" button in the Schema section.

### Full SQL Schema

```sql
-- ============ 0. Add required extensions ============
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ============ 1. Core table (idempotent) ============
create table if not exists public.performance_records (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  question_id  text not null,
  is_correct   boolean not null,
  time_ms      integer not null check (time_ms >= 0),
  created_at   timestamptz not null default now()
);

-- ============ 2. RLS & policies (self-only) ============
alter table public.performance_records enable row level security;

do $$
begin
  -- SELECT policy (self)
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'performance_records'
      and policyname = 'perf_select_self'
  ) then
    create policy perf_select_self
      on public.performance_records
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  -- INSERT policy (self)
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'performance_records'
      and policyname = 'perf_insert_self'
  ) then
    create policy perf_insert_self
      on public.performance_records
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end$$;

-- ============ 3. RPC your app is calling (JSONB) ============
drop function if exists public.log_performance_v1(jsonb);
create or replace function public.log_performance_v1(p_params jsonb)
returns public.performance_records
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_user    uuid;
  v_qid     text;
  v_correct boolean;
  v_time_ms integer;
  v_row     public.performance_records;
begin
  -- Prefer JWT; fall back to provided user_id (for tests/scripts)
  v_user := coalesce((p_params->>'user_id')::uuid, auth.uid());
  if v_user is null then
    raise exception 'AUTH_MISSING' using detail = 'No user in JWT and no user_id provided';
  end if;

  v_qid     := p_params->>'question_id';
  v_correct := (p_params->>'is_correct')::boolean;
  v_time_ms := (p_params->>'time_ms')::int;

  if v_qid is null or v_time_ms is null then
    raise exception 'BAD_INPUT' using detail = 'question_id and time_ms are required';
  end if;

  insert into public.performance_records(user_id, question_id, is_correct, time_ms)
  values (v_user, v_qid, v_correct, v_time_ms)
  returning * into v_row;

  return v_row;
end
$fn$;

-- 3. RPC Function for User Analytics
create or replace function public.get_user_analytics()
returns table(
  total_attempts integer,
  correct_attempts integer,
  accuracy_pct numeric,
  avg_time_ms integer
)
language sql
security definer
as $$
  select
    count(*)::int as total_attempts,
    count(*) filter (where is_correct)::int as correct_attempts,
    coalesce(round(100.0 * (count(*) filter (where is_correct)) / nullif(count(*),0), 2), 0)::numeric as accuracy_pct,
    coalesce(floor(avg(time_ms)), 0)::int as avg_time_ms
  from public.performance_records
  where user_id = auth.uid();
$$;

-- Tiny ping for health checks (optional)
drop function if exists public.drut_ping_v1();
create or replace function public.drut_ping_v1()
returns text language sql stable as $$ select 'ok'::text; $$;

-- ============ 4. Grants ============
grant usage on schema public to anon, authenticated;
grant select, insert on public.performance_records to authenticated;
grant execute on function public.log_performance_v1(jsonb) to authenticated;
grant execute on function public.get_user_analytics() to authenticated;
grant execute on function public.drut_ping_v1() to anon, authenticated;

-- ============ 5. Question Explanations Table (for real-time pipeline) ============
create table if not exists public.question_explanations (
  question_id text primary key,
  status text not null default 'pending',  -- pending|generating|ready|failed
  fast_md text,
  full_md text,
  fast_safe boolean,
  risk_shortcut real,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.question_explanations enable row level security;

-- RLS Policies for question_explanations
do $$
begin
  if not exists (select 1 from pg_policies where policyname='qe_read_all' and tablename='question_explanations') then
    create policy qe_read_all on public.question_explanations
      for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='qe_block_all_else' and tablename='question_explanations') then
    create policy qe_block_all_else on public.question_explanations
      for all to anon, authenticated using (false) with check (false);
  end if;
end$$;

grant select on public.question_explanations to anon, authenticated;

-- 6. RPC to Get or Enqueue an Explanation
create or replace function public.drut_get_or_enqueue_expl_v1(p_question_id text)
returns json
language plpgsql
security definer
as $$
declare rec question_explanations;
begin
  select * into rec from public.question_explanations where question_id = p_question_id;
  if rec is null then
    insert into public.question_explanations(question_id, status)
    values (p_question_id, 'pending')
    on conflict (question_id) do nothing;
  end if;

  return (
    select to_json(qe) from public.question_explanations qe
    where qe.question_id = p_question_id
  );
end;
$$;
grant execute on function public.drut_get_or_enqueue_expl_v1(text) to anon, authenticated;


-- ============ 7. Enable Realtime Publishing ============
-- Note: You may need to disable and re-enable this in the Supabase UI if you have issues.
alter publication supabase_realtime add table public.question_explanations;
alter publication supabase_realtime add table public.performance_records;


-- ============ 8. Ask PostgREST to reload schema ============
do $$ begin perform pg_notify('pgrst', 'reload schema'); exception when others then null; end $$;

```

## Supabase Storage Setup (for Avatars)

The user profile feature allows users to upload their own profile pictures. This requires a Supabase Storage bucket named `avatars`. The script below is the most reliable way to set this up correctly.

### How to Set Up Bucket and Policies

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
