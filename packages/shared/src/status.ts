/**
 * The status vocabularies, and their Mongolian labels, in one place.
 *
 * Both sets mirror a CHECK constraint in the database (see supabase/tables.sql),
 * so a typo here is a runtime rejection rather than a compile error unless the
 * types below are actually used — which is why `status` fields are typed as
 * these unions rather than as `string`.
 *
 * Labels live beside the values because they were previously written out at
 * each call site: "Нийтлэгдсэн" appeared in the admin grid, the moderation
 * filters and the edit modal's <select>, with nothing keeping them in step.
 */

/** Article states. `draft` is where the AI leaves a new article for review. */
export const ARTICLE_STATUSES = ["draft", "published", "rejected"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const ARTICLE_STATUS_LABEL: Record<ArticleStatus, string> = {
  draft:     "Хүлээгдэж байна",
  published: "Нийтлэгдсэн",
  rejected:  "Татгалзсан",
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
