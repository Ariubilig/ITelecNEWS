/** A raw article row as scraped and stored in the `articles` table. */
export interface Article {
  id: string | number;
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
  id: string | number;
  article_id?: string | number;
  status?: string;
  mood?: string;
  teen_headline?: string;
  teen_summary?: string;
  teen_body?: string;
  processed_at?: string;
  articles?: Article;
}

/** Form model for the admin edit modal in the Reading page. */
export interface EditForm {
  teen_headline: string;
  teen_summary: string;
  teen_body: string;
  mood: string;
  status: string;
  image: string;
}
