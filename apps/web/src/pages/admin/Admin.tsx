import "./Admin.css";
import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { getMoodStyle, ARTICLE_STATUS_LABEL, ARTICLE_STATUS_TONE } from "@itelecnews/shared";
import type { ArticleListItem, ArticleStatus } from "@itelecnews/shared";

import { supabase } from "../../lib/supabase";
import { useAdminList } from "../../hooks/useAdminList";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { allArticles } from "../../lib/queries";
import { FallbackImage } from "../../components/UI/FallbackImage";


interface AdminCardProps {
  item: ArticleListItem;
  index: number;
  onApprove: (id: number) => void;
  onDecline: (id: number) => void;
}

function AdminCard({ item, index, onApprove, onDecline }: AdminCardProps) {
  const article   = item.articles;
  const mood      = getMoodStyle(item.mood);
  const headline  = item.teen_headline || article?.title || "Гарчиг байхгүй";
  const status    = item.status ?? "draft";
  // Anything not yet published still offers approve/decline; only the badge
  // distinguishes a draft from a rejected one.
  const isPending = status !== "published";

  return (
    <article
      className={`card admin-card ${isPending ? "admin-card--pending" : ""}`}
      style={{ "--delay": `${index * 40}ms` } as React.CSSProperties}
    >
      {/* Only the image area links out — the action buttons below can't be
          nested inside an anchor. */}
      <Link className="card-img-wrap" to={`/article/${item.id}`}>
        <FallbackImage
          src={article?.image ?? null}
          alt={headline}
          className="card-img"
          fallbackClassName="card-img-empty"
        />

        <div className="card-img-overlay" />

        <div className="card-overlay-content">
          <h2 className="card-headline">{headline}</h2>
          <div className="admin-card-badges">
            <span className="mood-badge" style={mood.style}>{mood.label}</span>
            <span className={`badge tone-${ARTICLE_STATUS_TONE[status]}`}>
              {ARTICLE_STATUS_LABEL[status]}
            </span>
          </div>
        </div>
      </Link>

      <div className="admin-card-actions">
        {isPending ? (
          <>
            <button className="btn btn--tone tone-ok action-btn" onClick={() => onApprove(item.id)}>
              Зөвшөөрөх
            </button>
            <button className="btn btn--tone tone-danger action-btn" onClick={() => onDecline(item.id)}>
              Татгалзах
            </button>
          </>
        ) : (
          <button className="btn btn--tone tone-danger action-btn" onClick={() => onDecline(item.id)}>
            Буцаах
          </button>
        )}
      </div>
    </article>
  );
}


export default function Admin() {
  const navigate = useNavigate();
  useDocumentTitle("Бүх мэдээ — Админ");

  const { rows: articles, counts, loading, error, update } = useAdminList<ArticleListItem>({
    query: allArticles,
    table: "processed_articles",
    loadError: "Мэдээг ачаалахад алдаа гарлаа.",
  });

  const setStatus = (id: number, status: ArticleStatus, failMessage: string) =>
    update(id, { status }, failMessage);

  const handleApprove = (id: number) => setStatus(id, "published", "Зөвшөөрөхөд алдаа гарлаа.");
  const handleDecline = (id: number) => setStatus(id, "rejected",  "Татгалзахад алдаа гарлаа.");
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  // Loading and empty render the same shell around one line of text, inside the
  // page rather than instead of it — an early return dropped the header on
  // every load and popped it back in.
  const notice =
    loading                 ? "Уншиж байна…"
    : articles.length === 0 ? "Одоохондоо мэдээ байхгүй байна."
    : null;

  return (
    <div className="page-root">
      <div className="admin-header">
        <h1 className="admin-title">Бүх мэдээ</h1>
        <div className="admin-header-right">
          <div className="admin-counts">
            {!loading && (
              <>
                <span className="badge badge--count tone-warn">{counts.draft ?? 0} хүлээгдэж байна</span>
                <span className="badge badge--count tone-ok">{counts.published ?? 0} нийтлэгдсэн</span>
                {(counts.rejected ?? 0) > 0 && (
                  <span className="badge badge--count tone-danger">{counts.rejected} татгалзсан</span>
                )}
              </>
            )}
          </div>
          <Link className="btn btn--ghost admin-logout-btn" to="/admin/comments">Сэтгэгдэл</Link>
          <button className="btn btn--ghost admin-logout-btn" onClick={handleLogout}>Гарах</button>
        </div>
      </div>

      {error && <div className="notice tone-danger">{error}</div>}

      {notice ? (
        <div className="page-state">{notice}</div>
      ) : (
        <div className="card-grid">
          {articles.map((item, i) => (
            <AdminCard
              key={item.id}
              item={item}
              index={i}
              onApprove={handleApprove}
              onDecline={handleDecline}
            />
          ))}
        </div>
      )}
    </div>
  );
}
