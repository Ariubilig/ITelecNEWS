-- ============================================================================
-- Row Level Security + admin identity
-- ============================================================================
--
-- ⚠️  RECONSTRUCTED FILE — VERIFY BEFORE RUNNING AGAINST PRODUCTION.
--
-- The original migration was never committed: a bare `migrations` pattern in
-- .gitignore matched supabase/migrations/ at any depth and excluded it. The
-- policies below were rebuilt from the security model described in
-- DOCUMENTATION.md §6, not recovered from the live database.
--
-- Production already has working policies. This file exists so the model is in
-- version control and so a fresh project (staging, disaster recovery) can be
-- rebuilt. Before applying it to an existing database, diff it against what is
-- actually live — see the verification queries at the bottom of this file.
--
-- Everything here is idempotent and safe to re-run.
--
-- The scraper and both edge functions use the service-role key, which bypasses
-- RLS entirely, so ingestion and AI processing are unaffected by any of this.
-- ============================================================================


-- ── Admin identity ──────────────────────────────────────────────────────────

create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so the check itself isn't subject to RLS on `admins`
-- (otherwise every policy using it would recurse into another policy).
-- search_path is pinned so the function can't be redirected by a caller.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;


-- ── Enable RLS ──────────────────────────────────────────────────────────────
-- Enabling with no policy denies everything by default, which is what we want
-- for admins/comment_throttle: only the service role touches them.

alter table public.articles           enable row level security;
alter table public.processed_articles enable row level security;
alter table public.comments           enable row level security;
alter table public.admins             enable row level security;
alter table public.comment_throttle   enable row level security;


-- ── articles ────────────────────────────────────────────────────────────────
-- Public read (the reading page falls back to the source title/body); writes
-- are admin-only, because the edit modal updates `image` from the browser.

drop policy if exists "articles: public read"  on public.articles;
drop policy if exists "articles: admin write"  on public.articles;
drop policy if exists "articles: admin update" on public.articles;

create policy "articles: public read"
  on public.articles for select
  using (true);

create policy "articles: admin update"
  on public.articles for update
  using (public.is_admin())
  with check (public.is_admin());


-- ── processed_articles ──────────────────────────────────────────────────────
-- Drafts and rejected articles are invisible to the public at the database
-- level, not merely filtered by the client query.

drop policy if exists "processed_articles: public read published" on public.processed_articles;
drop policy if exists "processed_articles: admin read all"        on public.processed_articles;
drop policy if exists "processed_articles: admin update"          on public.processed_articles;

create policy "processed_articles: public read published"
  on public.processed_articles for select
  using (status = 'published' or public.is_admin());

create policy "processed_articles: admin update"
  on public.processed_articles for update
  using (public.is_admin())
  with check (public.is_admin());


-- ── comments ────────────────────────────────────────────────────────────────
-- No anon INSERT at all: the submit-comment edge function is the only writer,
-- so `status` can't be injected by a client. Admins can read every comment
-- (including hidden ones) and change status — that's what the moderation
-- screen in the admin panel drives.

drop policy if exists "comments: public read published" on public.comments;
drop policy if exists "comments: admin read all"        on public.comments;
drop policy if exists "comments: admin update"          on public.comments;
drop policy if exists "comments: admin delete"          on public.comments;

create policy "comments: public read published"
  on public.comments for select
  using (status = 'published' or public.is_admin());

create policy "comments: admin update"
  on public.comments for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "comments: admin delete"
  on public.comments for delete
  using (public.is_admin());


-- ── admins ──────────────────────────────────────────────────────────────────
-- Readable only by admins; membership is managed out of band (SQL editor or
-- the seed block below). Never writable from the browser.

drop policy if exists "admins: admin read" on public.admins;

create policy "admins: admin read"
  on public.admins for select
  using (public.is_admin());


-- ── Seed the first admin ────────────────────────────────────────────────────
-- Bootstrapping only — with no rows in `admins`, is_admin() is false for
-- everyone and nothing is writable from the browser.
--
-- ⚠️  SET THIS EMAIL before running on a fresh project. It must match a user
-- that already exists in auth.users (create it in the Supabase dashboard
-- first — public signup is disabled by design, see DOCUMENTATION.md §6).
-- No-ops if the user doesn't exist, so a wrong value fails safe rather than
-- granting access to the wrong account.

do $$
declare
  owner_email constant text := 'CHANGE_ME@example.com';
begin
  insert into public.admins (user_id)
  select id from auth.users where email = owner_email
  on conflict (user_id) do nothing;

  if not found then
    raise notice 'No auth.users row for %, no admin seeded.', owner_email;
  end if;
end $$;


-- ── Indexes ─────────────────────────────────────────────────────────────────
-- These back the queries the app runs on every page load. Kept here rather
-- than in tables.sql so a fresh project gets them from the migration.

create index if not exists articles_unprocessed_idx
  on public.articles (id) where processed = false;

create index if not exists processed_articles_feed_idx
  on public.processed_articles (status, processed_at desc);

create index if not exists comments_thread_idx
  on public.comments (article_id, status, created_at);

create index if not exists comment_throttle_ip_idx
  on public.comment_throttle (ip, created_at desc);


-- ============================================================================
-- Verification — run these against production and compare with the above
-- before assuming this file matches what is live.
--
--   select tablename, rowsecurity from pg_tables
--    where schemaname = 'public' order by tablename;
--
--   select tablename, policyname, cmd, qual, with_check
--     from pg_policies where schemaname = 'public'
--    order by tablename, policyname;
--
--   select prosecdef, proconfig, prosrc
--     from pg_proc where proname = 'is_admin';
-- ============================================================================
