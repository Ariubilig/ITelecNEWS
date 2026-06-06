-- ─────────────────────────────────────────────────────────────────────────────
-- Schema snapshot for context only. NOT executed.
-- The real migrations live in `supabase/migrations/` (gitignored locally; run
-- with `supabase db push`). This file mirrors the columns + constraints that
-- the application code reads/writes so a fresh reader can match types to DB.
--
-- See DOCUMENTATION.md §6 (Security) for the RLS policies and §7 for the
-- column-level reference.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.articles (
  id         bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  url        text NOT NULL UNIQUE,
  title      text NOT NULL,
  date       text,
  image      text,
  body       text,
  processed  boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT articles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.processed_articles (
  id            bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  article_id    bigint NOT NULL UNIQUE,
  teen_headline text,
  teen_summary  text,
  teen_body     text,
  mood          text,
  -- Values must match the editor dropdown in Reading.tsx + Admin.tsx.
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'published', 'rejected')),
  processed_at  timestamp with time zone,
  CONSTRAINT processed_articles_pkey PRIMARY KEY (id),
  CONSTRAINT processed_articles_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id)
);

CREATE TABLE public.comments (
  id         bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  article_id bigint NOT NULL,
  parent_id  bigint,
  guest_name text NOT NULL,
  content    text NOT NULL,
  status     text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'published', 'hidden', 'deleted')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id),
  CONSTRAINT comments_parent_id_fkey  FOREIGN KEY (parent_id)  REFERENCES public.comments(id)
);

CREATE TABLE public.admins (
  user_id    uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (user_id),
  CONSTRAINT admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.comment_throttle (
  id         bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  ip         text NOT NULL,
  article_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT comment_throttle_pkey PRIMARY KEY (id)
);
