-- get_user_analytics: per-user practice totals powering the dashboard
-- "Total practice" / accuracy / avg-time cards. The web client
-- (analyticsService.fetchUserAnalytics) calls rpc('get_user_analytics') with no
-- args. Previously this RPC did not exist → the call 400'd and, because it sits
-- in the dashboard's Promise.all, blanked every stat card. (The client is now
-- also resilient, but this makes the number real.)
--
-- Self-only: uses auth.uid() with NO p_user_id parameter, so it cannot leak
-- another user's data (unlike the older get_*(p_user_id) analytics RPCs).
--
-- NOTE: an older get_user_analytics() already existed in the live DB with a
-- different return shape; `create or replace` can't change a function's return
-- type, so we drop it first.

drop function if exists public.get_user_analytics();

create or replace function public.get_user_analytics()
returns table (
  total_attempts   bigint,
  correct_attempts bigint,
  accuracy_pct     numeric,
  avg_time_ms      numeric
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    count(*)::bigint                                as total_attempts,
    count(*) filter (where was_correct)::bigint     as correct_attempts,
    case when count(*) > 0
         then round(100.0 * count(*) filter (where was_correct) / count(*), 1)
         else 0 end                                 as accuracy_pct,
    coalesce(round(avg(time_taken_ms)), 0)::numeric as avg_time_ms
  from public.user_question_history
  where user_id = auth.uid();
$$;

revoke all on function public.get_user_analytics() from public;
grant execute on function public.get_user_analytics() to authenticated;
