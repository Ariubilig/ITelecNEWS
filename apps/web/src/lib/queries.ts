import type { ArticleListItem } from "@itelecnews/shared";
import { supabase } from "./supabase";

/**
 * Central place for the Supabase reads the UI repeats. Each returns a query
 * builder (a thenable resolving to `{ data, error }`), so they pair directly
 * with {@link useQuery}.
 */

/**
 * Columns the grid views actually render. Deliberately narrow: selecting
 * `*, articles(*)` pulled `teen_body` plus the full source `body` HTML for
 * every card, so a 60-card home grid downloaded megabytes of article text it
 * never displayed. Only the reading page needs the bodies.
 *
 * The client has no generated database types, so PostgREST can't tell that
 * `articles` is a many-to-one embed and infers it as an array. `.returns<>()`
 * below states the real row shape.
 */
const LIST_COLUMNS = "id, mood, status, teen_headline, articles(title, image)";

/** Published articles for the public home grid, newest first. */
export const publishedArticles = () =>
  supabase
    .from("processed_articles")
    .select(LIST_COLUMNS)
    .eq("status", "published")
    .order("processed_at", { ascending: false })
    .limit(60)
    .returns<ArticleListItem[]>();

/** Every processed article (any status) for the admin dashboard, newest first. */
export const allArticles = () =>
  supabase
    .from("processed_articles")
    .select(LIST_COLUMNS)
    .order("processed_at", { ascending: false })
    .limit(200)
    .returns<ArticleListItem[]>();

/** A single processed article joined with its source row, for the reading page. */
export const articleById = (id: string) =>
  supabase
    .from("processed_articles")
    .select("*, articles(*)")
    .eq("id", id)
    .single();

/** Published comments for one article, oldest first (so replies thread correctly). */
export const commentsFor = (articleId: number) =>
  supabase
    .from("comments")
    .select("*")
    .eq("article_id", articleId)
    .eq("status", "published")
    .order("created_at", { ascending: true });
