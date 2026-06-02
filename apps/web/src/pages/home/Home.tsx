import "./Home.css";
import React from "react";
import { useNavigate } from "react-router-dom";
import { getMoodStyle } from "@itelecnews/shared";
import type { ProcessedArticle } from "@itelecnews/shared";
import { useQuery } from "../../lib/useQuery";
import { publishedArticles } from "../../lib/queries";
import { FallbackImage } from "../../components/UI/FallbackImage";


interface ArticleCardProps {
  item: ProcessedArticle;
  index: number;
}

function ArticleCard({ item, index }: ArticleCardProps) {
  const navigate = useNavigate();
  const article  = item.articles;
  const mood     = getMoodStyle(item.mood);
  const headline = item.teen_headline || article?.title || "Гарчиг байхгүй";

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
        <FallbackImage
          src={article?.image ?? null}
          alt={headline}
          className="card-img"
          fallbackClassName="card-img-empty"
        />

        <div className="card-img-overlay" />

        <div className="card-overlay-content">
          <h2 className="card-headline">{headline}</h2>
          <span
            className="mood-badge"
            style={{ color: mood.color, background: mood.bg, borderColor: mood.border }}
          >
            {mood.label}
          </span>
        </div>
      </div>
    </article>
  );
}


export default function Home() {
  const { data, loading, error } = useQuery<ProcessedArticle[]>(publishedArticles, []);
  const articles = data ?? [];

  if (loading) {
    return (
      <div className="home-root">
        <div className="home-loading">Уншиж байна…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-root">
        <div className="home-empty">Мэдээг ачаалахад алдаа гарлаа.</div>
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
