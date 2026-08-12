/** A raw article row as scraped and stored in the `articles` table. */
export interface Article {
  id: number;
  title?: string;
  image?: string;
  url?: string;
  date?: string;
  body?: string;
}

/** The shape the scraper produces for insertion into `articles`. */
export interface ScrapedArticle {
  title: string;
  date: string;
  image: string;
  body: string;
}

/** An AI-rewritten article row from `processed_articles`, optionally joined with its source `articles` row. */
export interface ProcessedArticle {
  id: number;
  article_id?: number;
  status?: string;
  mood?: string;
  teen_headline?: string;
  teen_summary?: string;
  teen_body?: string;
  processed_at?: string;
  articles?: Article;
}

/**
 * The trimmed shape the grid views fetch. List screens render a thumbnail, a
 * headline and two badges — never the article body — so they select just these
 * columns instead of pulling every row's full HTML.
 */
export type ArticleListItem =
  Pick<ProcessedArticle, "id" | "mood" | "status" | "teen_headline"> & {
    articles?: Pick<Article, "title" | "image">;
  };

/** Form model for the admin edit modal in the Reading page. */
export interface EditForm {
  teen_headline: string;
  teen_summary: string;
  teen_body: string;
  mood: string;
  status: string;
  image: string;
}

/** A row from the `comments` table. */
export interface Comment {
  id: number;
  article_id: number;
  parent_id: number | null;
  guest_name: string;
  content: string;
  created_at: string;
}
