-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.articles (
  processed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  url text NOT NULL UNIQUE,
  title text NOT NULL,
  date text,
  image text,
  body text,
  CONSTRAINT articles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.processed_articles (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  article_id bigint NOT NULL UNIQUE,
  teen_headline text,
  teen_summary text,
  teen_body text,
  mood text,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'rejected'::text])),
  processed_at timestamp with time zone,
  CONSTRAINT processed_articles_pkey PRIMARY KEY (id),
  CONSTRAINT processed_articles_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id)
);
CREATE TABLE public.comments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  article_id bigint NOT NULL,
  guest_name text NOT NULL,
  content text NOT NULL,
  parent_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['published'::text, 'hidden'::text, 'deleted'::text, 'pending'::text])),
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id),
  CONSTRAINT comments_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id)
);
CREATE TABLE public.admins (
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (user_id),
  CONSTRAINT admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.comment_throttle (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  ip text NOT NULL,
  article_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT comment_throttle_pkey PRIMARY KEY (id)
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
-- Unlike the table definitions above, these are safe to run as-is. Each one
-- backs a query the app issues on every page load; without them Postgres
-- falls back to a sequential scan as the tables grow.
-- (`articles.url` is already indexed by its UNIQUE constraint, which is what
-- makes the scraper's "which URLs do we already have" pre-check cheap.)

-- process-articles: find the unprocessed backlog. Partial, since processed
-- rows are the overwhelming majority and never match.
CREATE INDEX IF NOT EXISTS articles_unprocessed_idx
  ON public.articles (id) WHERE processed = false;

-- Home feed (status + processed_at DESC) and the admin list (processed_at DESC).
CREATE INDEX IF NOT EXISTS processed_articles_feed_idx
  ON public.processed_articles (status, processed_at DESC);

-- Comment threads for one article, oldest first.
CREATE INDEX IF NOT EXISTS comments_thread_idx
  ON public.comments (article_id, status, created_at);

-- Rate-limit lookup: most recent posts from one IP.
CREATE INDEX IF NOT EXISTS comment_throttle_ip_idx
  ON public.comment_throttle (ip, created_at DESC);

-- ── Housekeeping ────────────────────────────────────────────────────────────
-- `comment_throttle` is append-only and only ever read over a 1-hour window, so
-- it grows without bound. Trim it periodically (e.g. a scheduled job):
--   DELETE FROM public.comment_throttle WHERE created_at < now() - interval '1 day';