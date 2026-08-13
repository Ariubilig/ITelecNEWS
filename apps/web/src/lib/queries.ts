import type { ArticleListItem, ModeratedComment } from "@itelecnews/shared";
import { supabase } from "./supabase";

/**
 * Central place for the Supabase reads the UI repeats. Each returns a query
 * builder (a thenable resolving to `{ data, error }`), so they pair directly
 * with {@link useQuery}.
 */

/**
 * Columns the grid views actually render. Deliberately narrow — `*, articles(*)`
 * pulls the full body HTML for every card, which no grid displays.
 *
 * Without generated database types PostgREST infers the `articles` embed as an
 * array, so `.returns<>()` below states the real row shape.
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

/**
 * Every comment in any state for the moderation screen, newest first. RLS
 * returns non-published rows only to admins, so a non-admin simply sees the
 * published subset.
 */
export const allComments = () =>
  supabase
    .from("comments")
    // `comments.article_id` points at `articles`, so this is the direct FK.
    // The source title identifies the thread well enough to moderate.
    .select("*, articles(id, title)")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<ModeratedComment[]>();
