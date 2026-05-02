import "./Home.css";
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";


interface MoodStyle {
  label: string;
  color: string;
  bg: string;
  border: string;
}

interface Article {
  id: string | number;
  title?: string;
  image?: string;
  url?: string;
  date?: string;
  body?: string;
}

interface ProcessedArticle {
  id: string | number;
  mood?: string;
  teen_headline?: string;
  article_id?: string | number;
  articles?: Article;
  processed_at?: string;
}


const MOOD_STYLE: Record<string, MoodStyle> = {
  wild:      { label: "Гайхмаар",        color: "#ff6b35", bg: "rgba(255,107,53,0.12)",  border: "rgba(255,107,53,0.35)" },
  heavy:     { label: "Хүнд",            color: "#a8b5c8", bg: "rgba(168,181,200,0.10)", border: "rgba(168,181,200,0.28)" },
  inspiring: { label: "Урамдуулах",      color: "#f5c842", bg: "rgba(245,200,66,0.10)",  border: "rgba(245,200,66,0.30)" },
  sus:       { label: "Эргэлзээтэй",     color: "#c084fc", bg: "rgba(192,132,252,0.10)", border: "rgba(192,132,252,0.30)" },
  lowkey:    { label: "Намуун",          color: "#6ee7b7", bg: "rgba(110,231,183,0.10)", border: "rgba(110,231,183,0.28)" },
  chaotic:   { label: "Эмх замбараагүй", color: "#fb923c", bg: "rgba(251,146,60,0.10)",  border: "rgba(251,146,60,0.30)" },
  important: { label: "Чухал",           color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.30)" },
};


function getMoodStyle(mood: string | undefined): MoodStyle | null {
  if (!mood) return null;
  return MOOD_STYLE[mood.toLowerCase().trim()] ?? null;
}

function getImage(article: Article | undefined): string | null {
  return article?.image ?? null;
}


interface ArticleCardProps {
  item: ProcessedArticle;
  index: number;
}

function ArticleCard({ item, index }: ArticleCardProps) {
  const navigate = useNavigate();
  const article  = item.articles;
  const mood     = getMoodStyle(item.mood);
  const headline = item.teen_headline || article?.title || "Гарчиг байхгүй";
  const imageUrl = getImage(article);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <article
      className="card"
      // Cast needed because CSS custom properties aren't in the CSSProperties type
      style={{ "--delay": `${index * 55}ms` } as React.CSSProperties}
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

        <div className="card-overlay-content">
          <h2 className="card-headline">{headline}</h2>
          {mood && (
            <span
              className="mood-badge"
              style={{ color: mood.color, background: mood.bg, borderColor: mood.border }}
            >
              {mood.label}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}


export default function Home() {
  const [articles, setArticles] = useState<ProcessedArticle[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("processed_articles")
        .select("*, articles(*)")
        .order("processed_at", { ascending: false })
        .limit(60);

      setArticles(data ?? []);
    })();
  }, []);

  return (
    <div className="home-root">
      {articles.length > 0 && (
        <div className="articles-grid">
          {articles.map((item, i) => (
            <ArticleCard key={String(item.id)} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}