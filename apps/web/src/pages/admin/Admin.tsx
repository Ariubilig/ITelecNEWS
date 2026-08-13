import "./Admin.css";
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getMoodStyle, ARTICLE_STATUS_LABEL } from "@itelecnews/shared";
import type { ArticleListItem, ArticleStatus } from "@itelecnews/shared";

import { supabase } from "../../lib/supabase";
import { useQuery } from "../../lib/useQuery";
import { useAdminGuard } from "../../hooks/useAdminGuard";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { allArticles } from "../../lib/queries";
import { commitStatus } from "../../lib/commitStatus";
import { FallbackImage } from "../../components/UI/FallbackImage";


/** Tally the three status buckets in one pass instead of three `filter` scans. */
function countByStatus(items: ArticleListItem[]) {
  const counts = { pending: 0, published: 0, rejected: 0 };
  for (const a of items) {
    if (a.status === "published") counts.published++;
    else if (a.status === "rejected") counts.rejected++;
    else counts.pending++;
  }
  return counts;
}


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
            <span className={`status-badge status-badge--${status}`}>
              {ARTICLE_STATUS_LABEL[status]}
            </span>
          </div>
        </div>
      </Link>

      <div className="admin-card-actions">
        {isPending ? (
          <>
            <button className="action-btn action-btn--approve" onClick={() => onApprove(item.id)}>
              Зөвшөөрөх
            </button>
            <button className="action-btn action-btn--decline" onClick={() => onDecline(item.id)}>
              Татгалзах
            </button>
          </>
        ) : (
          <button className="action-btn action-btn--decline" onClick={() => onDecline(item.id)}>
            Буцаах
          </button>
        )}
      </div>
    </article>
  );
}


export default function Admin() {
  const navigate = useNavigate();
  const authed = useAdminGuard();
  const [actionError, setActionError] = useState("");

  useDocumentTitle("Бүх мэдээ — Админ");

  // Only fetch once authed; useQuery stays in the loading state until then.
  const { data, loading, error: loadError, setData } =
    useQuery<ArticleListItem[]>(allArticles, [authed], authed);
  const articles = data ?? [];
  const error = actionError || (loadError ? "Мэдээг ачаалахад алдаа гарлаа." : "");

  const setStatus = async (id: number, status: ArticleStatus, failMessage: string) =>
    setActionError(
      await commitStatus({
        table: "processed_articles",
        id, patch: { status }, rows: articles, setRows: setData, failMessage,
      }),
    );

  const handleApprove = (id: number) => setStatus(id, "published", "Зөвшөөрөхөд алдаа гарлаа.");
  const handleDecline = (id: number) => setStatus(id, "rejected",  "Татгалзахад алдаа гарлаа.");
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="page-root">
        <div className="page-state">Уншиж байна…</div>
      </div>
    );
  }

  const counts = countByStatus(articles);

  return (
    <div className="page-root">
      <div className="admin-header">
        <h1 className="admin-title">Бүх мэдээ</h1>
        <div className="admin-header-right">
          <div className="admin-counts">
            <span className="admin-count-badge admin-count-badge--pending">{counts.pending} хүлээгдэж байна</span>
            <span className="admin-count-badge admin-count-badge--published">{counts.published} нийтлэгдсэн</span>
            {counts.rejected > 0 && (
              <span className="admin-count-badge admin-count-badge--rejected">{counts.rejected} татгалзсан</span>
            )}
          </div>
          <Link className="admin-logout-btn" to="/admin/comments">Сэтгэгдэл</Link>
          <button className="admin-logout-btn" onClick={handleLogout}>Гарах</button>
        </div>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {articles.length === 0 ? (
        <div className="page-state">Одоохондоо мэдээ байхгүй байна.</div>
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
