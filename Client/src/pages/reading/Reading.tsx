import './Reading.css'
import { supabase } from "../../lib/supabase";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const MOOD_CONFIG = {
  wild:      { label: "Гайхмаар",      color: "#ff6b35", bg: "rgba(255,107,53,0.12)",  border: "rgba(255,107,53,0.35)" },
  heavy:     { label: "Хүнд",     color: "#a8b5c8", bg: "rgba(168,181,200,0.10)", border: "rgba(168,181,200,0.28)" },
  inspiring: { label: "Урамдуулах", color: "#f5c842", bg: "rgba(245,200,66,0.10)",  border: "rgba(245,200,66,0.30)" },
  sus:       { label: "Эргэлзээтэй",       color: "#c084fc", bg: "rgba(192,132,252,0.10)", border: "rgba(192,132,252,0.30)" },
  lowkey:    { label: "Намуун",    color: "#6ee7b7", bg: "rgba(110,231,183,0.10)", border: "rgba(110,231,183,0.28)" },
  chaotic:   { label: "Эмх замбараагүй",   color: "#fb923c", bg: "rgba(251,146,60,0.10)",  border: "rgba(251,146,60,0.30)" },
  important: { label: "Чухал", color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.30)" },
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
      <div className="reading-root">
        <nav className="reading-nav">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <span className="back-arrow">←</span> Буцах
          </button>
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
                Эх сурвалж
              </a>
            )}
          </>
        )}
      </div>
    </>
  );
}