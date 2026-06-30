-- Migration: web_handoff_tokens
--
-- One-time, short-lived tokens that let an authenticated MOBILE user hand their
-- identity to the WEB /subscribe page WITHOUT a re-login. The token is opaque,
-- single-use (marked used on redemption), and expires in ~2 minutes. It is the
-- ONLY thing that ever appears in the redirect URL — the actual login credential
-- is minted server-side at redeem time and never touches the URL.
--
-- Security: RLS is ON with NO policies, so anon/authenticated callers cannot read
-- or write this table at all. Only the service-role client (used inside the
-- create-subscribe-handoff and redeem-subscribe-handoff edge functions) can.

create table if not exists public.web_handoff_tokens (
  token       text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz
);

-- Optional auditing / cleanup helpers.
create index if not exists web_handoff_tokens_user_idx    on public.web_handoff_tokens(user_id);
create index if not exists web_handoff_tokens_expires_idx on public.web_handoff_tokens(expires_at);

-- RLS on, zero policies => deny-all to anon + authenticated; service-role bypasses RLS.
alter table public.web_handoff_tokens enable row level security;

comment on table public.web_handoff_tokens is
  'One-time, short-lived (~2 min) mobile->web subscribe handoff tokens. Service-role only; RLS denies all anon/authenticated access.';
