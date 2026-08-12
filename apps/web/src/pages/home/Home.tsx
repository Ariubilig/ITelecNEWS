import "./Home.css";
import React from "react";
import { useNavigate } from "react-router-dom";
import { getMoodStyle } from "@itelecnews/shared";
import type { ArticleListItem } from "@itelecnews/shared";

import { useQuery } from "../../lib/useQuery";
import { publishedArticles } from "../../lib/queries";
import { FallbackImage } from "../../components/UI/FallbackImage";


interface ArticleCardProps {
  item: ArticleListItem;
  index: number;
}

function ArticleCard({ item, index }: ArticleCardProps) {
  const navigate = useNavigate();
  const article  = item.articles;
  const mood     = getMoodStyle(item.mood);
  const headline = item.teen_headline || article?.title || "Гарчиг байхгүй";
  const open     = () => navigate(`/article/${item.id}`);

  return (
    <article
      className="card"
      style={{ "--delay": `${index * 55}ms` } as React.CSSProperties}
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && open()}
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
          <span className="mood-badge" style={mood.style}>{mood.label}</span>
        </div>
      </div>
    </article>
  );
}


export default function Home() {
  const { data, loading, error } = useQuery<ArticleListItem[]>(publishedArticles, []);
  const articles = data ?? [];

  // Loading, error and empty all render the same shell around one line of text.
  const notice =
    loading                 ? "Уншиж байна…"
    : error                 ? "Мэдээг ачаалахад алдаа гарлаа."
    : articles.length === 0 ? "Одоохондоо мэдээ байхгүй байна."
    : null;

  return (
    <div className="home-root">
      {notice ? (
        <div className={loading ? "home-loading" : "home-empty"}>{notice}</div>
      ) : (
        <div className="articles-grid">
          {articles.map((item, i) => (
            <ArticleCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
