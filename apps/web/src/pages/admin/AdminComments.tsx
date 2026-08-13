import "./AdminComments.css";
import { useState } from "react";
import { Link } from "react-router-dom";
import { COMMENT_STATUSES, COMMENT_STATUS_LABEL, COMMENT_STATUS_TONE } from "@itelecnews/shared";
import type { CommentStatus, ModeratedComment } from "@itelecnews/shared";

import { useQuery } from "../../lib/useQuery";
import { useAdminGuard } from "../../hooks/useAdminGuard";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { allComments } from "../../lib/queries";
import { commitStatus } from "../../lib/commitStatus";
import { timeAgo } from "../../lib/comments";

type Filter = "all" | CommentStatus;

// Derived from the status vocabulary so a new status can't be added to the
// database and silently go unmoderatable here.
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Бүгд" },
  ...COMMENT_STATUSES.map((key) => ({ key, label: COMMENT_STATUS_LABEL[key] })),
];


export default function AdminComments() {
  const authed = useAdminGuard();
  const [filter, setFilter] = useState<Filter>("all");
  const [actionError, setActionError] = useState("");

  useDocumentTitle("Сэтгэгдэл — Админ");

  const { data, loading, error: loadError, setData } =
    useQuery<ModeratedComment[]>(allComments, [authed], authed);

  const comments = data ?? [];
  const error = actionError || (loadError ? "Сэтгэгдлийг ачаалахад алдаа гарлаа." : "");

  // `updated_at` is NOT NULL DEFAULT now() but has no trigger maintaining it,
  // so a row moderated a month later would still read as last-changed at
  // creation time unless we set it here. This screen is the only writer that
  // ever updates a comment; if another one appears, move this to a trigger.
  const setStatus = async (id: number, status: CommentStatus) =>
    setActionError(
      await commitStatus({
        table: "comments",
        id,
        patch: { status, updated_at: new Date().toISOString() },
        rows: comments,
        setRows: setData,
        failMessage: "Төлөв өөрчлөхөд алдаа гарлаа.",
      }),
    );

  const counts = comments.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  const visible = filter === "all" ? comments : comments.filter((c) => c.status === filter);

  if (loading) {
    return (
      <div className="page-root mod-root">
        <div className="page-state page-state--short">Уншиж байна…</div>
      </div>
    );
  }

  return (
    <div className="page-root mod-root">
      <div className="mod-header">
        <div>
          <h1 className="mod-title">Сэтгэгдэл</h1>
          <p className="mod-subtitle">Сүүлийн 200 сэтгэгдэл</p>
        </div>
        <Link className="mod-link" to="/admin">← Мэдээ рүү</Link>
      </div>

      <div className="mod-filters">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            className={`mod-filter ${filter === key ? "mod-filter--active" : ""}`}
            onClick={() => setFilter(key)}
          >
            {label}
            <span className="mod-filter-count">
              {key === "all" ? comments.length : counts[key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {error && <div className="notice tone-danger">{error}</div>}

      {visible.length === 0 ? (
        <div className="page-state page-state--short">Энд сэтгэгдэл байхгүй байна.</div>
      ) : (
        <ul className="mod-list">
          {visible.map((c) => (
            <li key={c.id} className={`mod-item mod-item--${c.status}`}>
              <div className="mod-item-head">
                <span className="mod-name">{c.guest_name}</span>
                <span className="mod-dot" />
                <span className="mod-time">{timeAgo(c.created_at)}</span>
                <span className={`badge tone-${COMMENT_STATUS_TONE[c.status]}`}>
                  {COMMENT_STATUS_LABEL[c.status]}
                </span>
                {c.parent_id != null && <span className="mod-reply-tag">хариу</span>}
              </div>

              <p className="mod-content">{c.content}</p>

              {c.articles?.title && (
                <p className="mod-source">{c.articles.title}</p>
              )}

              <div className="mod-actions">
                {c.status !== "published" && (
                  <button
                    className="btn btn--tone tone-ok mod-btn"
                    onClick={() => setStatus(c.id, "published")}
                  >
                    Нийтлэх
                  </button>
                )}
                {c.status !== "hidden" && (
                  <button
                    className="btn btn--tone tone-neutral mod-btn"
                    onClick={() => setStatus(c.id, "hidden")}
                  >
                    Нуух
                  </button>
                )}
                {c.status !== "deleted" && (
                  <button
                    className="btn btn--tone tone-danger mod-btn"
                    onClick={() => setStatus(c.id, "deleted")}
                  >
                    Устгах
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
