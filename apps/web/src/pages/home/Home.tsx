import React from "react";
import { Link } from "react-router-dom";
import { getMoodStyle } from "@itelecnews/shared";
import type { ArticleListItem } from "@itelecnews/shared";

import { useQuery } from "../../hooks/useQuery";
import { publishedArticles } from "../../lib/queries";
import { FallbackImage } from "../../components/UI/FallbackImage";


interface ArticleCardProps {
  item: ArticleListItem;
  index: number;
}

function ArticleCard({ item, index }: ArticleCardProps) {
  const article  = item.articles;
  const mood     = getMoodStyle(item.mood);
  const headline = item.teen_headline || article?.title || "Гарчиг байхгүй";

  // A real anchor rather than a div with a click handler: crawlers can follow
  // it, middle-click and "open in new tab" work, and Enter/Space come free
  // instead of being hand-rolled.
  return (
    <Link
      to={`/article/${item.id}`}
      className="card"
      style={{ "--delay": `${index * 55}ms` } as React.CSSProperties}
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
    </Link>
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
    <div className="page-root">
      {notice ? (
        <div className="page-state">{notice}</div>
      ) : (
        <div className="card-grid">
          {articles.map((item, i) => (
            <ArticleCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
