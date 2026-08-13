import "./AdminComments.css";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import type { CommentStatus, ModeratedComment } from "@itelecnews/shared";

import { supabase } from "../../lib/supabase";
import { useQuery } from "../../lib/useQuery";
import { useSession } from "../../hooks/useSession";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { allComments } from "../../lib/queries";
import { timeAgo } from "../../lib/comments";

type Filter = "all" | CommentStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",       label: "Бүгд" },
  { key: "published", label: "Нийтлэгдсэн" },
  { key: "hidden",    label: "Нуусан" },
  { key: "pending",   label: "Хүлээгдэж байна" },
  { key: "deleted",   label: "Устгасан" },
];

const STATUS_LABEL: Record<CommentStatus, string> = {
  published: "Нийтлэгдсэн",
  hidden:    "Нуусан",
  pending:   "Хүлээгдэж байна",
  deleted:   "Устгасан",
};


export default function AdminComments() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useSession();
  const authed = !!session;

  const [filter, setFilter] = useState<Filter>("all");
  const [actionError, setActionError] = useState("");

  useDocumentTitle("Сэтгэгдэл — Админ");

  useEffect(() => {
    if (!authLoading && !authed) navigate("/admin/login");
  }, [authLoading, authed, navigate]);

  const { data, loading, error: loadError, setData } =
    useQuery<ModeratedComment[]>(allComments, [authed], authed);

  const comments = data ?? [];
  const error = actionError || (loadError ? "Сэтгэгдлийг ачаалахад алдаа гарлаа." : "");

  // Optimistic: flip the row locally, roll back if the write fails. RLS is the
  // real gate here — a non-admin's update is rejected by the database.
  const setStatus = async (id: number, status: CommentStatus) => {
    setActionError("");
    const previous = comments;
    setData((prev) => (prev ?? []).map((c) => (c.id === id ? { ...c, status } : c)));

    const { error: updateErr } = await supabase
      .from("comments")
      .update({ status })
      .eq("id", id);

    if (updateErr) {
      setData(previous);
      setActionError("Төлөв өөрчлөхөд алдаа гарлаа.");
    }
  };

  const counts = comments.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  const visible = filter === "all" ? comments : comments.filter((c) => c.status === filter);

  if (loading) {
    return (
      <div className="mod-root">
        <div className="mod-state">Уншиж байна…</div>
      </div>
    );
  }

  return (
    <div className="mod-root">
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

      {error && <div className="mod-error">{error}</div>}

      {visible.length === 0 ? (
        <div className="mod-state">Энд сэтгэгдэл байхгүй байна.</div>
      ) : (
        <ul className="mod-list">
          {visible.map((c) => (
            <li key={c.id} className={`mod-item mod-item--${c.status}`}>
              <div className="mod-item-head">
                <span className="mod-name">{c.guest_name}</span>
                <span className="mod-dot" />
                <span className="mod-time">{timeAgo(c.created_at)}</span>
                <span className={`mod-badge mod-badge--${c.status}`}>
                  {STATUS_LABEL[c.status] ?? c.status}
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
                    className="mod-btn mod-btn--publish"
                    onClick={() => setStatus(c.id, "published")}
                  >
                    Нийтлэх
                  </button>
                )}
                {c.status !== "hidden" && (
                  <button
                    className="mod-btn mod-btn--hide"
                    onClick={() => setStatus(c.id, "hidden")}
                  >
                    Нуух
                  </button>
                )}
                {c.status !== "deleted" && (
                  <button
                    className="mod-btn mod-btn--delete"
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
