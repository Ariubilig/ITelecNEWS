import "./Admin.css";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMoodStyle } from "@itelecnews/shared";
import type { ProcessedArticle } from "@itelecnews/shared";

import { supabase } from "../../lib/supabase";
import { useQuery } from "../../lib/useQuery";
import { useSession } from "../../hooks/useSession";
import { allArticles } from "../../lib/queries";
import { FallbackImage } from "../../components/UI/FallbackImage";

type Id = string | number;


interface AdminCardProps {
  item: ProcessedArticle;
  index: number;
  onApprove: (id: Id) => void;
  onDecline: (id: Id) => void;
}

function AdminCard({ item, index, onApprove, onDecline }: AdminCardProps) {
  const navigate  = useNavigate();
  const article   = item.articles;
  const mood      = getMoodStyle(item.mood);
  const headline  = item.teen_headline || article?.title || "Гарчиг байхгүй";
  const isPending = item.status !== "published";

  const open = () => navigate(`/article/${item.id}`);

  return (
    <article
      className={`admin-card ${isPending ? "admin-card--pending" : ""}`}
      style={{ "--delay": `${index * 40}ms` } as React.CSSProperties}
    >
      <div
        className="admin-card-img-wrap"
        onClick={open}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && open()}
        style={{ cursor: "pointer" }}
      >
        <FallbackImage
          src={article?.image ?? null}
          alt={headline}
          className="admin-card-img"
          fallbackClassName="admin-card-img-empty"
        />

        <div className="admin-card-img-overlay" />

        <div className="admin-card-overlay-content">
          <h2 className="admin-card-headline">{headline}</h2>
          <div className="admin-card-badges">
            <span
              className="mood-badge"
              style={{ color: mood.color, background: mood.bg, borderColor: mood.border }}
            >
              {mood.label}
            </span>
            <span className={`status-badge ${isPending ? "status-badge--pending" : "status-badge--published"}`}>
              {isPending ? "Хүлээгдэж байна" : "Нийтлэгдсэн"}
            </span>
          </div>
        </div>
      </div>

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
  const { session, loading: authLoading } = useSession();
  const authed = !!session;

  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!authLoading && !authed) navigate("/admin/login");
  }, [authLoading, authed, navigate]);

  // Only fetch once authed; useQuery stays in the loading state until then.
  const { data, loading, error: loadError, setData } =
    useQuery<ProcessedArticle[]>(allArticles, [authed], authed);
  const articles = data ?? [];
  const error = actionError || (loadError ? "Мэдээг ачаалахад алдаа гарлаа." : "");

  const setStatus = async (id: Id, status: string, failMsg: string) => {
    setActionError("");
    const { error: updateErr } = await supabase
      .from("processed_articles")
      .update({ status })
      .eq("id", id);
    if (updateErr) {
      setActionError(failMsg);
      return;
    }
    setData((prev) => (prev ?? []).map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const handleApprove = (id: Id) => setStatus(id, "published", "Зөвшөөрөхөд алдаа гарлаа.");
  const handleDecline = (id: Id) => setStatus(id, "rejected",  "Татгалзахад алдаа гарлаа.");
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="admin-root">
        <div className="admin-loading">Уншиж байна…</div>
      </div>
    );
  }

  const pending   = articles.filter((a) => a.status !== "published" && a.status !== "rejected");
  const published = articles.filter((a) => a.status === "published");
  const rejected  = articles.filter((a) => a.status === "rejected");

  return (
    <div className="admin-root">
      <div className="admin-header">
        <h1 className="admin-title">Бүх мэдээ</h1>
        <div className="admin-header-right">
          <div className="admin-counts">
            <span className="admin-count-badge admin-count-badge--pending">{pending.length} хүлээгдэж байна</span>
            <span className="admin-count-badge admin-count-badge--published">{published.length} нийтлэгдсэн</span>
            {rejected.length > 0 && (
              <span className="admin-count-badge admin-count-badge--rejected">{rejected.length} татгалзсан</span>
            )}
          </div>
          <button className="admin-logout-btn" onClick={handleLogout}>Гарах</button>
        </div>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {articles.length === 0 ? (
        <div className="admin-empty">Одоохондоо мэдээ байхгүй байна.</div>
      ) : (
        <div className="admin-grid">
          {articles.map((item, i) => (
            <AdminCard
              key={String(item.id)}
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
