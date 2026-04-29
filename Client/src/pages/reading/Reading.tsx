import './Reading.css'
import { supabase } from "../../lib/supabase";
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import BackIcon from "../../assets/back.svg";
import CommentIcon from "../../assets/comment.svg";
import LinkIcon from "../../assets/link.svg";

const MOOD_CONFIG = {
  wild:      { label: "Гайхмаар",        color: "#ff6b35", bg: "rgba(255,107,53,0.12)",  border: "rgba(255,107,53,0.35)" },
  heavy:     { label: "Хүнд",            color: "#a8b5c8", bg: "rgba(168,181,200,0.10)", border: "rgba(168,181,200,0.28)" },
  inspiring: { label: "Урамдуулах",      color: "#f5c842", bg: "rgba(245,200,66,0.10)",  border: "rgba(245,200,66,0.30)" },
  sus:       { label: "Эргэлзээтэй",     color: "#c084fc", bg: "rgba(192,132,252,0.10)", border: "rgba(192,132,252,0.30)" },
  lowkey:    { label: "Намуун",          color: "#6ee7b7", bg: "rgba(110,231,183,0.10)", border: "rgba(110,231,183,0.28)" },
  chaotic:   { label: "Эмх замбараагүй", color: "#fb923c", bg: "rgba(251,146,60,0.10)",  border: "rgba(251,146,60,0.30)" },
  important: { label: "Чухал",           color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.30)" },
};

function getMoodStyle(mood) {
  if (!mood) return MOOD_CONFIG.heavy;
  const key = mood.toLowerCase().trim();
  return MOOD_CONFIG[key] || MOOD_CONFIG.heavy;
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
  const [fabLeft, setFabLeft] = useState(null);

  const contentRef = useRef(null);

  useEffect(() => {
    async function fetchArticle() {
      const { data } = await supabase
        .from("processed_articles")
        .select(`*, articles(*)`)
        .eq("id", id)
        .single();
      setItem(data);
    }
    fetchArticle();
  }, [id]);

  // Anchor fab 40px to the right of the article's actual right edge
  useEffect(() => {
    function updateLeft() {
      if (!contentRef.current) return;
      const { right } = contentRef.current.getBoundingClientRect();
      setFabLeft(right + 40);
    }
    const raf = requestAnimationFrame(updateLeft);
    window.addEventListener("resize", updateLeft, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateLeft);
    };
  }, [item]);

  const article = item?.articles;
  const imageUrl = getImageUrl(article);
  const mood = getMoodStyle(item?.mood);
  const headline = item?.teen_headline || article?.title || "Гарчиг байхгүй";
  const summary = item?.teen_summary;
  const body = item?.teen_body || article?.body;

  function handleOpenLink() {
    if (article?.url) window.open(article.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="reading-root" ref={contentRef}>

      {/* Floating action buttons — individual circles with dividers */}
      <div
        className="fab-panel"
        style={fabLeft != null ? { left: fabLeft } : undefined}
      >
        <button className="fab-btn" onClick={() => navigate(-1)} aria-label="Буцах">
          <img src={BackIcon} className="fab-icon" alt="" />
        </button>

        <div className="fab-divider" />

        <button className="fab-btn" onClick={() => {}} aria-label="Сэтгэгдэл">
          <img src={CommentIcon} className="fab-icon" alt="" />
        </button>

        <div className="fab-divider" />

        <button className="fab-btn" onClick={handleOpenLink} aria-label="Эх сурвалж нээх">
          <img src={LinkIcon} className="fab-icon" alt="" />
        </button>
      </div>

      {item && (
        <>
          {article?.date && (
            <div className="article-meta">
              <span className="article-date">{article.date}</span>
            </div>
          )}
          <div
            className="hero-mood"
            style={{ background: mood.bg, borderColor: mood.border, color: mood.color }}
          >
            {mood.label}
          </div>

          {imageUrl && (
            <div className="hero-wrap">
              <img
                src={imageUrl}
                alt={headline}
                className="hero-img"
                onError={(e) => { e.target.parentElement.style.display = "none"; }}
              />
              <div className="hero-gradient" />
            </div>
          )}

          {!imageUrl && (
            <div
              className="inline-mood"
              style={{ background: mood.bg, borderColor: mood.border, color: mood.color }}
            >
              {mood.label}
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
        </>
      )}
    </div>
  );
}