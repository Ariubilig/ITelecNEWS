import "./Admin.css";
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import { getMoodStyle } from "../../lib/mood";

interface Article {
  id: string | number;
  title?: string;
  image?: string;
}

interface ProcessedArticle {
  id: string | number;
  status?: string;
  mood?: string;
  teen_headline?: string;
  article_id?: string | number;
  articles?: Article;
  processed_at?: string;
}


interface AdminCardProps {
  item: ProcessedArticle;
  index: number;
  onApprove: (id: string | number) => void;
  onDecline: (id: string | number) => void;
}

function AdminCard({ item, index, onApprove, onDecline }: AdminCardProps) {
  const navigate = useNavigate();
  const article   = item.articles;
  const mood      = getMoodStyle(item.mood);
  const headline  = item.teen_headline || article?.title || "Гарчиг байхгүй";
  const imageUrl  = article?.image ?? null;
  const [imgFailed, setImgFailed] = useState(false);
  const isPending = item.status !== "published";

  return (
    <article
      className={`admin-card ${isPending ? "admin-card--pending" : ""}`}
      style={{ "--delay": `${index * 40}ms` } as React.CSSProperties}
    >
      <div
        className="admin-card-img-wrap"
        onClick={() => navigate(`/article/${item.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && navigate(`/article/${item.id}`)}
        style={{ cursor: "pointer" }}
      >
        {imageUrl && !imgFailed ? (
          <img
            src={imageUrl}
            alt={headline}
            className="admin-card-img"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="admin-card-img-empty" aria-hidden="true" />
        )}

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
            <button
              className="action-btn action-btn--approve"
              onClick={() => onApprove(item.id)}
            >
              Зөвшөөрөх
            </button>
            <button
              className="action-btn action-btn--decline"
              onClick={() => onDecline(item.id)}
            >
              Татгалзах
            </button>
          </>
        ) : (
          <button
            className="action-btn action-btn--decline"
            onClick={() => onDecline(item.id)}
          >
            Буцаах
          </button>
        )}
      </div>
    </article>
  );
}


export default function Admin() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<ProcessedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/admin/login");
      } else {
        setAuthed(true);
      }
    });
  }, [navigate]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("processed_articles")
        .select("*, articles(*)")
        .order("processed_at", { ascending: false })
        .limit(200);
      setArticles(data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (authed) fetchArticles(); }, [authed]);

  const handleApprove = async (id: string | number) => {
    await supabase.from("processed_articles").update({ status: "published" }).eq("id", id);
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "published" } : a))
    );
  };

  const handleDecline = async (id: string | number) => {
    await supabase.from("processed_articles").update({ status: "rejected" }).eq("id", id);
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "rejected" } : a))
    );
  };

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
