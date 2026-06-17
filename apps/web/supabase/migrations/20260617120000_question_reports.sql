-- question_reports: user-submitted reports on bad/broken questions.
-- Insert path: web + mobile QuestionCard "Report this question" button.
-- Read/triage path: web admin tab.
-- Notification: Supabase Database Webhook → report-question-notify edge fn
--                emails support@drut.club (see migration 20260617120300).

create table if not exists public.question_reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  question_id   text not null,                         -- cached_questions.id (text key)
  category      text not null check (category in ('wrong-answer','typo','unclear','other')),
  message       text,                                  -- optional free-form
  status        text not null default 'open'
                  check (status in ('open','triaged','resolved','dismissed')),
  -- Lightweight context captured at submission so triage is self-contained:
  exam_profile  text,                                  -- e.g. 'ap_eapcet'
  subject       text,                                  -- e.g. 'Physics'
  client        text,                                  -- 'web' | 'mobile-ios' | 'mobile-android'
  created_at    timestamptz not null default now(),
  triaged_at    timestamptz,
  resolved_at   timestamptz,
  resolved_by   uuid references auth.users(id) on delete set null,
  admin_notes   text
);

create index if not exists question_reports_question_id_idx on public.question_reports(question_id);
create index if not exists question_reports_status_idx      on public.question_reports(status);
create index if not exists question_reports_created_at_idx  on public.question_reports(created_at desc);

alter table public.question_reports enable row level security;

-- Users can submit a report tied to their own user_id (or anonymous via JWT-less).
create policy "question_reports_insert_own"
  on public.question_reports for insert
  with check (auth.uid() = user_id);

-- Users can read their own reports (for "we received your report" status views).
create policy "question_reports_select_own"
  on public.question_reports for select
  using (auth.uid() = user_id);

-- Admin reads + writes everywhere — checked via JWT app_metadata.role = 'admin'.
-- Same pattern used by admin-bulk-import edge fn.
create policy "question_reports_admin_all"
  on public.question_reports for all
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );

comment on table  public.question_reports is 'User-submitted reports on broken/unclear questions. Inserted from QuestionCard "Report" button on web + mobile.';
comment on column public.question_reports.client is 'Submission origin: web / mobile-ios / mobile-android';
