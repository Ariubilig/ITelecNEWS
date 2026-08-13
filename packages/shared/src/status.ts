/**
 * The status vocabularies, their Mongolian labels and their tones, in one place.
 *
 * Both sets mirror a CHECK constraint in supabase/tables.sql — tests/status.test.ts
 * reads those constraints and fails if the two drift apart.
 */

/** The semantic colours in the UI. `tone-${Tone}` is the class name. */
export type Tone = "ok" | "warn" | "danger" | "neutral";

/** Article states. `draft` is where the AI leaves a new article for review. */
export const ARTICLE_STATUSES = ["draft", "published", "rejected"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const ARTICLE_STATUS_LABEL: Record<ArticleStatus, string> = {
  draft:     "Хүлээгдэж байна",
  published: "Нийтлэгдсэн",
  rejected:  "Татгалзсан",
};

/** Kept beside the label so a new status can't get a name but no colour. */
export const ARTICLE_STATUS_TONE: Record<ArticleStatus, Tone> = {
  draft:     "warn",
  published: "ok",
  rejected:  "danger",
};

/** Comment states. `published` is what readers see. */
export const COMMENT_STATUSES = ["published", "hidden", "deleted", "pending"] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export const COMMENT_STATUS_LABEL: Record<CommentStatus, string> = {
  published: "Нийтлэгдсэн",
  hidden:    "Нуусан",
  pending:   "Хүлээгдэж байна",
  deleted:   "Устгасан",
};

export const COMMENT_STATUS_TONE: Record<CommentStatus, Tone> = {
  published: "ok",
  hidden:    "neutral",
  pending:   "warn",
  deleted:   "danger",
};
