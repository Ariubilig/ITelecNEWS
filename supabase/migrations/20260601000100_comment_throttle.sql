-- Comment rate limiting: route all guest comments through the submit-comment
-- edge function (service role) so we can throttle per IP and force the status
-- server-side. Anon clients can no longer INSERT comments directly.

begin;

-- Per-IP post log used by the submit-comment function to enforce a cooldown
-- and an hourly cap. RLS on with no policies => only the service role touches it.
create table if not exists public.comment_throttle (
  id         bigint generated always as identity primary key,
  ip         text not null,
  article_id bigint,
  created_at timestamptz not null default now()
);

create index if not exists comment_throttle_ip_created_idx
  on public.comment_throttle (ip, created_at desc);

alter table public.comment_throttle enable row level security;

-- Remove the interim anon-insert path; the edge function (service role) is now
-- the only writer. Anon retains SELECT of published comments from the earlier
-- migration.
drop policy if exists "comments_anon_insert_published" on public.comments;

commit;
