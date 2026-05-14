import "./Home.css";
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import { getMoodStyle } from "../../lib/mood";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("processed_articles")
          .select("*, articles(*)")
          .eq("status", "published")
          .order("processed_at", { ascending: false })
          .limit(60);

        setArticles(data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="home-root">
        <div className="home-loading">Уншиж байна…</div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="home-root">
        <div className="home-empty">Одоохондоо мэдээ байхгүй байна.</div>
      </div>
    );
  }

  return (
    <div className="home-root">
      <div className="articles-grid">
        {articles.map((item, i) => (
          <ArticleCard key={String(item.id)} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}