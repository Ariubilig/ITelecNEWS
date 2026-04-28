import { useEffect, useState } from "react";
import "./Home.css";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

// ── Mood styling map ──────────────────────────────────────────────────────────
const MOOD_STYLE = {
  wild:      { label: "Wild",      color: "#ff6b35", bg: "rgba(255,107,53,0.12)",  border: "rgba(255,107,53,0.35)" },
  heavy:     { label: "Heavy",     color: "#a8b5c8", bg: "rgba(168,181,200,0.10)", border: "rgba(168,181,200,0.28)" },
  inspiring: { label: "Inspiring", color: "#f5c842", bg: "rgba(245,200,66,0.10)",  border: "rgba(245,200,66,0.30)" },
  sus:       { label: "Sus",       color: "#c084fc", bg: "rgba(192,132,252,0.10)", border: "rgba(192,132,252,0.30)" },
  lowkey:    { label: "Lowkey",    color: "#6ee7b7", bg: "rgba(110,231,183,0.10)", border: "rgba(110,231,183,0.28)" },
  chaotic:   { label: "Chaotic",   color: "#fb923c", bg: "rgba(251,146,60,0.10)",  border: "rgba(251,146,60,0.30)" },
  important: { label: "Important", color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.30)" },
};

function getMoodStyle(mood) {
  if (!mood) return null;
  return MOOD_STYLE[mood.toLowerCase().trim()] ?? null;
}

function getImage(article) {
  return article?.image || null;
}

// ── Article Card ──────────────────────────────────────────────────────────────
function ArticleCard({ item, index }) {
  const navigate = useNavigate();
  const article  = item.articles;
  const mood     = getMoodStyle(item.mood);
  const headline = item.teen_headline || article?.title || "Гарчиг байхгүй";
  const imageUrl = getImage(article);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <article
      className="card"
      style={{ "--delay": `${index * 55}ms` }}
      onClick={() => navigate(`/article/${item.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/article/${item.id}`)}
    >
      <div className="card-img-wrap">
        {imageUrl && !imgFailed ? (
          <img
            src={imageUrl}
            alt={headline}
            className="card-img"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="card-img-empty" aria-hidden="true" />
        )}
        <div className="card-img-overlay" />

        {mood && (
          <span
            className="mood-badge"
            style={{ color: mood.color, background: mood.bg, borderColor: mood.border }}
          >
            {mood.label}
          </span>
        )}
      </div>

      <div className="card-body">
        <h2 className="card-headline">{headline}</h2>
      </div>
    </article>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [articles, setArticles] = useState([]);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("processed_articles")
          .select("*, articles(*)")
          .order("processed_at", { ascending: false })
          .limit(60);

        if (error) throw error;
        setArticles(data || []);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  return (
    <div className="home-root">
      {error && (
        <div className="state-wrap">
          <span className="state-error">Алдаа гарлаа: {error}</span>
        </div>
      )}

      {!error && articles.length === 0 && (
        <div className="state-wrap">
          <span className="state-text">Мэдээ олдсонгүй</span>
        </div>
      )}

      {!error && articles.length > 0 && (
        <div className="articles-grid">
          {articles.map((item, i) => (
            <ArticleCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}