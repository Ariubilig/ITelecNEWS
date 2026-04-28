import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const MOOD_CONFIG = {
  happy:       { label: "😄 Баяртай",    bg: "#22c55e22", border: "#22c55e", color: "#86efac" },
  sad:         { label: "😢 Гунигтай",   bg: "#3b82f622", border: "#3b82f6", color: "#93c5fd" },
  angry:       { label: "😡 Уурлалтай",  bg: "#ef444422", border: "#ef4444", color: "#fca5a5" },
  surprising:  { label: "😲 Гайхалтай",  bg: "#f59e0b22", border: "#f59e0b", color: "#fcd34d" },
  inspiring:   { label: "✨ Урамдуулах",  bg: "#a855f722", border: "#a855f7", color: "#d8b4fe" },
  informative: { label: "📘 Мэдээлэл",   bg: "#06b6d422", border: "#06b6d4", color: "#67e8f9" },
  funny:       { label: "😂 Инээдтэй",   bg: "#eab30822", border: "#eab308", color: "#fde047" },
  neutral:     { label: "😐 Төвийн",     bg: "#6b728022", border: "#6b7280", color: "#d1d5db" },
};

function getMoodStyle(mood) {
  if (!mood) return MOOD_CONFIG.neutral;
  const key = mood.toLowerCase().trim();
  return MOOD_CONFIG[key] || MOOD_CONFIG.neutral;
}

function getImageUrl(article) {
  if (!article?.image) return null;
  if (article.image.startsWith("http")) return article.image;
  return `https://unread.today/files/${article.id}/${article.image}`;
}

export default function Reading() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchArticle() {
      try {
        const { data, error } = await supabase
          .from("processed_articles")
          .select(`*, articles(*)`)
          .eq("id", id)
          .single();

        if (error) throw error;
        setItem(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchArticle();
  }, [id]);

  const article = item?.articles;
  const imageUrl = getImageUrl(article);
  const mood = getMoodStyle(item?.mood);
  const headline = item?.teen_headline || article?.title || "Гарчиг байхгүй";
  const summary = item?.teen_summary;
  const body = item?.teen_body || article?.body;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0a0a0b;
          color: #e8e8e8;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          min-height: 100vh;
        }

        .reading-root {
          max-width: 720px;
          margin: 0 auto;
          padding: 0 16px 80px;
          animation: fadeIn 0.35s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Nav bar ── */
        .reading-nav {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 0 24px;
          position: sticky;
          top: 0;
          background: rgba(10,10,11,0.92);
          backdrop-filter: blur(12px);
          z-index: 10;
        }
        .back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #1a1a1e;
          border: 1px solid #2a2a30;
          border-radius: 8px;
          color: #aaa;
          font-size: 13px;
          padding: 7px 14px;
          cursor: pointer;
          transition: all 0.18s ease;
          font-family: inherit;
        }
        .back-btn:hover {
          background: #222228;
          color: #fff;
          border-color: #3b82f6;
        }
        .back-arrow { font-size: 16px; line-height: 1; }
        .nav-logo {
          font-size: 15px;
          font-weight: 800;
          color: #fff;
          margin-left: auto;
          letter-spacing: -0.3px;
        }
        .nav-logo span { color: #3b82f6; }

        /* ── Hero image ── */
        .hero-wrap {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          height: 320px;
          margin-bottom: 28px;
          background: #111115;
        }
        .hero-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .hero-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7) 100%);
        }
        .hero-mood {
          position: absolute;
          top: 14px;
          right: 14px;
          font-size: 12px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 20px;
          border: 1px solid;
          backdrop-filter: blur(10px);
          letter-spacing: 0.02em;
        }

        /* ── Mood badge (no image) ── */
        .inline-mood {
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 20px;
          border: 1px solid;
          letter-spacing: 0.02em;
          margin-bottom: 20px;
        }

        /* ── Article content ── */
        .article-meta {
          margin-bottom: 10px;
        }
        .article-date {
          font-size: 12px;
          color: #555;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .article-headline {
          font-size: clamp(22px, 5vw, 32px);
          font-weight: 800;
          line-height: 1.25;
          color: #fff;
          letter-spacing: -0.5px;
          margin-bottom: 16px;
        }

        .divider {
          height: 1px;
          background: #1c1c20;
          margin: 20px 0;
        }

        .article-summary {
          font-size: 16px;
          line-height: 1.7;
          color: #b0b0b8;
          padding: 16px 18px;
          border-left: 3px solid #3b82f6;
          background: #0f0f14;
          border-radius: 0 8px 8px 0;
          margin-bottom: 24px;
          font-style: italic;
        }

        .article-body {
          font-size: 16px;
          line-height: 1.85;
          color: #ccc;
        }
        .article-body p {
          margin-bottom: 20px;
        }
        .article-body p:last-child {
          margin-bottom: 0;
        }

        /* ── Source link ── */
        .source-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 40px;
          font-size: 13px;
          color: #3b82f6;
          text-decoration: none;
          border: 1px solid #1e3a5f;
          padding: 8px 16px;
          border-radius: 8px;
          background: #0d1f38;
          transition: all 0.18s ease;
        }
        .source-link:hover {
          background: #1e3a5f;
          border-color: #3b82f6;
        }

        /* ── States ── */
        .state-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 16px;
          color: #444;
        }
        .state-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid #1f1f23;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .state-text { font-size: 14px; }
        .state-error { color: #ef4444; font-size: 14px; }

        @media (max-width: 600px) {
          .hero-wrap { height: 220px; }
          .article-headline { font-size: 20px; }
        }
      `}</style>

      <div className="reading-root">
        <nav className="reading-nav">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <span className="back-arrow">←</span> Буцах
          </button>
          <div className="nav-logo">un<span>read</span>.today</div>
        </nav>

        {loading && (
          <div className="state-wrap">
            <div className="state-spinner" />
            <span className="state-text">Мэдээ ачааллаж байна…</span>
          </div>
        )}

        {error && (
          <div className="state-wrap">
            <span className="state-error">Алдаа гарлаа: {error}</span>
          </div>
        )}

        {!loading && !error && item && (
          <>
            {imageUrl && (
              <div className="hero-wrap">
                <img
                  src={imageUrl}
                  alt={headline}
                  className="hero-img"
                  onError={(e) => { e.target.parentElement.style.display = "none"; }}
                />
                <div className="hero-gradient" />
                <div
                  className="hero-mood"
                  style={{
                    background: mood.bg,
                    borderColor: mood.border,
                    color: mood.color,
                  }}
                >
                  {mood.label}
                </div>
              </div>
            )}

            {!imageUrl && (
              <div
                className="inline-mood"
                style={{
                  background: mood.bg,
                  borderColor: mood.border,
                  color: mood.color,
                }}
              >
                {mood.label}
              </div>
            )}

            {article?.date && (
              <div className="article-meta">
                <span className="article-date">{article.date}</span>
              </div>
            )}

            <h1 className="article-headline">{headline}</h1>

            {summary && (
              <blockquote className="article-summary">{summary}</blockquote>
            )}

            {body && (
              <>
                <div className="divider" />
                <div className="article-body">
                  {body.split("\n").filter(Boolean).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </>
            )}

            {article?.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="source-link"
              >
                🔗 Эх сурвалж харах
              </a>
            )}
          </>
        )}
      </div>
    </>
  );
}