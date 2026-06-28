-- daily_question_usage: tracks per-user per-day question counts to enforce
-- the free-tier 20/day quota. Pro users bypass this in app code.
--
-- Increment: paymentService.incrementDailyQuestionUsage() on web + mobile calls
--            increment_daily_question_usage() after the user answers a question
--            (practice via performanceService, sprint via sprintService).
-- Read: paymentService.assertWithinFreeQuota() calls get_today_question_usage()
--       before serving the next batch of questions.
--
-- IMPORTANT: the limit (20 = FREE_DAILY_QUESTION_LIMIT) is enforced in app code,
-- NOT in the DB, so we can A/B test or relax it without a migration. The DB only
-- tracks the count.

create table if not exists public.daily_question_usage (
  user_id     uuid not null references auth.users(id) on delete cascade,
  usage_date  date not null default current_date,
  count       integer not null default 0 check (count >= 0),
  updated_at  timestamptz not null default now(),
  primary key (user_id, usage_date)
);

create index if not exists daily_question_usage_date_idx on public.daily_question_usage(usage_date desc);

alter table public.daily_question_usage enable row level security;

-- Users may READ their own usage row (transparency), but MUST NOT write it directly.
-- Writes go ONLY through increment_daily_question_usage() (SECURITY DEFINER, below),
-- which bypasses RLS. We deliberately grant NO insert/update/delete policy to the
-- authenticated role: otherwise a user could `UPDATE ... SET count = 0` and reset
-- their own quota to bypass the paywall. The SECURITY DEFINER RPC is the only writer.
drop policy if exists "daily_question_usage_select_own" on public.daily_question_usage;
create policy "daily_question_usage_select_own"
  on public.daily_question_usage for select
  using (auth.uid() = user_id);

-- Remove any legacy self-write policies from earlier drafts (defensive).
drop policy if exists "daily_question_usage_insert_own" on public.daily_question_usage;
drop policy if exists "daily_question_usage_update_own" on public.daily_question_usage;

-- Admin read-all
drop policy if exists "daily_question_usage_admin_select" on public.daily_question_usage;
create policy "daily_question_usage_admin_select"
  on public.daily_question_usage for select
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

-- Atomic increment RPC. Returns the NEW count after increment.
-- Clients call this via supabase.rpc('increment_daily_question_usage').
-- security definer means it runs with table-owner perms so the upsert works
-- without forcing the client to handle the conflict explicitly.
create or replace function public.increment_daily_question_usage()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_count   integer;
begin
  if v_user_id is null then
    raise exception 'must be authenticated to increment usage';
  end if;

  insert into public.daily_question_usage (user_id, usage_date, count, updated_at)
  values (v_user_id, current_date, 1, now())
  on conflict (user_id, usage_date) do update
    set count       = public.daily_question_usage.count + 1,
        updated_at  = now()
  returning count into v_count;

  return v_count;
end;
$$;

revoke all on function public.increment_daily_question_usage() from public;
grant execute on function public.increment_daily_question_usage() to authenticated;

-- Read helper: today's count for the calling user. Default 0 if no row yet.
create or replace function public.get_today_question_usage()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select count from public.daily_question_usage
       where user_id = auth.uid() and usage_date = current_date),
    0
  );
$$;

revoke all on function public.get_today_question_usage() from public;
grant execute on function public.get_today_question_usage() to authenticated;

comment on table public.daily_question_usage is 'Per-user per-day question counts for free-tier 20/day quota enforcement. Limit lives in app code (FREE_DAILY_QUESTION_LIMIT), not here.';
