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
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'approved'::text, 'published'::text, 'rejected'::text])),
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