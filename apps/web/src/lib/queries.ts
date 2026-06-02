import { supabase } from "./supabase";

/**
 * Central place for the Supabase reads the UI repeats. Each returns a query
 * builder (a thenable resolving to `{ data, error }`), so they pair directly
 * with {@link useQuery}.
 */

/** Published articles for the public home grid, newest first. */
export const publishedArticles = () =>
  supabase
    .from("processed_articles")
    .select("*, articles(*)")
    .eq("status", "published")
    .order("processed_at", { ascending: false })
    .limit(60);

/** Every processed article (any status) for the admin dashboard, newest first. */
export const allArticles = () =>
  supabase
    .from("processed_articles")
    .select("*, articles(*)")
    .order("processed_at", { ascending: false })
    .limit(200);

/** A single processed article joined with its source row, for the reading page. */
export const articleById = (id: string) =>
  supabase
    .from("processed_articles")
    .select("*, articles(*)")
    .eq("id", id)
    .single();

/** Published comments for one article, oldest first (so replies thread correctly). */
export const commentsFor = (articleId: string | number) =>
  supabase
    .from("comments")
    .select("*")
    .eq("article_id", articleId)
    .eq("status", "published")
    .order("created_at", { ascending: true });
