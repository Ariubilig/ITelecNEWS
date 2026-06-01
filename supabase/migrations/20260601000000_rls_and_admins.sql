-- Production hardening: admin identity + Row Level Security.
--
-- Context: the web app talks to the database with the public anon key and only
-- gates the admin UI in React. Without RLS, anyone with the anon key (it ships
-- in the browser bundle) can read drafts and write to every table. This migration
-- introduces an explicit admin registry and locks every table down.
--
-- The scraper and the process-articles edge function use the SERVICE ROLE key,
-- which bypasses RLS entirely, so ingestion keeps working untouched.

begin;

-- ── Admin registry ──────────────────────────────────────────────────────────
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS on with no policies => no anon/authenticated access at all (service role
-- and the is_admin() SECURITY DEFINER function can still read it).
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Seed the owner. The account must already exist (created via the login page).
-- CONFIRM this email before running in production.
insert into public.admins (user_id)
select id from auth.users where email = 'arierdene0@gmail.com'
on conflict (user_id) do nothing;

-- ── articles ─────────────────────────────────────────────────────────────────
-- Raw scraped news rows. Body is public news; allow public read so the
-- articles(*) join on Home/Reading works. Writes are admin-only (scraper uses
-- the service role and bypasses these policies).
alter table public.articles enable row level security;

create policy "articles_select_all"
  on public.articles for select
  using (true);

create policy "articles_admin_insert"
  on public.articles for insert
  with check (public.is_admin());

create policy "articles_admin_update"
  on public.articles for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "articles_admin_delete"
  on public.articles for delete
  using (public.is_admin());

-- ── processed_articles ────────────────────────────────────────────────────────
-- Public sees only published rows; admins see everything (drafts for review).
alter table public.processed_articles enable row level security;

create policy "processed_articles_select_published_or_admin"
  on public.processed_articles for select
  using (status = 'published' or public.is_admin());

create policy "processed_articles_admin_insert"
  on public.processed_articles for insert
  with check (public.is_admin());

create policy "processed_articles_admin_update"
  on public.processed_articles for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "processed_articles_admin_delete"
  on public.processed_articles for delete
  using (public.is_admin());

-- ── comments ───────────────────────────────────────────────────────────────────
-- Public sees only published comments; admins see everything.
-- Anon may insert, but only with status 'published' (prevents status injection).
-- This anon-insert path is replaced by the rate-limited submit-comment edge
-- function in a later migration; until then the site keeps working.
alter table public.comments enable row level security;

create policy "comments_select_published_or_admin"
  on public.comments for select
  using (status = 'published' or public.is_admin());

create policy "comments_anon_insert_published"
  on public.comments for insert
  with check (status = 'published');

create policy "comments_admin_update"
  on public.comments for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "comments_admin_delete"
  on public.comments for delete
  using (public.is_admin());

commit;
