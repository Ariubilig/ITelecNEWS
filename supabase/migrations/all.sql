-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.articles (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  url text NOT NULL UNIQUE,
  title text NOT NULL,
  date text,
  image text,
  body text,
  created_at timestamp with time zone DEFAULT now(),
  processed boolean NOT NULL DEFAULT false,
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
  edited_by text,
  ai_processed_at timestamp with time zone,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT processed_articles_pkey PRIMARY KEY (id),
  CONSTRAINT processed_articles_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id)
);