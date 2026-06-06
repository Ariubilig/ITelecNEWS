import "./Reading.css";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import DOMPurify from "dompurify";
import { getMoodStyle } from "@itelecnews/shared";
import type { ProcessedArticle } from "@itelecnews/shared";

import { useQuery } from "../../lib/useQuery";
import { articleById } from "../../lib/queries";
import { useSession } from "../../hooks/useSession";

import Comments from "../../components/comment/Comment";
import EditArticleModal from "./EditArticleModal";

import BackIcon    from "../../assets/back.svg";
import CommentIcon from "../../assets/comment.svg";
import LinkIcon    from "../../assets/link.svg";
import EditIcon    from "../../assets/edit.svg";


export default function Reading() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: item, loading, refetch } =
    useQuery<ProcessedArticle>(() => articleById(id!), [id]);

  const { session } = useSession();
  const isAdmin = !!session;

  const [editing, setEditing] = useState(false);
  const [fabLeft, setFabLeft] = useState<number | null>(null);

  // Freeze the smoothed scroll while the editor modal is open so the page behind
  // doesn't drift when the user scrolls inside the textarea. Order matters:
  // capture position → pause → restore, because pausing can nudge the scroll.
  useEffect(() => {
    const smoother = ScrollSmoother.get();
    if (!smoother) return;
    if (editing) {
      const pos = smoother.scrollTop();
      smoother.paused(true);
      smoother.scrollTop(pos);
    } else {
      smoother.paused(false);
    }
    return () => { ScrollSmoother.get()?.paused(false); };
  }, [editing]);

  // Anchor the FAB column 40px to the right of the article's actual right edge.
  useEffect(() => {
    function updateLeft() {
      const el = contentRef.current;
      if (!el) return;
      setFabLeft(el.getBoundingClientRect().right + 40);
    }
    const raf = requestAnimationFrame(updateLeft);
    window.addEventListener("resize", updateLeft, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateLeft);
    };
  }, [item]);

  const article  = item?.articles;
  const imageUrl = article?.image ?? null;
  const mood     = getMoodStyle(item?.mood);
  const headline = item?.teen_headline || article?.title || "Гарчиг байхгүй";
  const summary  = item?.teen_summary;
  const body     = item?.teen_body || article?.body;

  const openSource     = () => article?.url && window.open(article.url, "_blank", "noopener,noreferrer");
  const scrollComments = () => document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="reading-root" ref={contentRef}>

      <div className="fab-panel" style={fabLeft != null ? { left: fabLeft } : undefined}>
        <button className="fab-btn" onClick={() => navigate(-1)} aria-label="Буцах">
          <img src={BackIcon} className="fab-icon" alt="" />
        </button>
        <div className="fab-divider" />
        <button className="fab-btn" onClick={scrollComments} aria-label="Сэтгэгдэл">
          <img src={CommentIcon} className="fab-icon" alt="" />
        </button>
        <div className="fab-divider" />
        <button className="fab-btn" onClick={openSource} aria-label="Эх сурвалж нээх">
          <img src={LinkIcon} className="fab-icon" alt="" />
        </button>
        {isAdmin && (
          <>
            <div className="fab-divider" />
            <button className="fab-btn fab-btn--edit" onClick={() => setEditing(true)} aria-label="Засах">
              <img src={EditIcon} className="fab-icon" alt="" />
            </button>
          </>
        )}
      </div>

      {!loading && !item && <div className="reading-empty">Мэдээ олдсонгүй.</div>}

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

          {imageUrl ? (
            <div className="hero-wrap">
              <img
                src={imageUrl}
                alt={headline}
                className="hero-img"
                onError={(e) => {
                  const wrap = (e.target as HTMLImageElement).parentElement;
                  if (wrap) wrap.style.display = "none";
                }}
              />
              <div className="hero-gradient" />
            </div>
          ) : (
            <div
              className="inline-mood"
              style={{ background: mood.bg, borderColor: mood.border, color: mood.color }}
            >
              {mood.label}
            </div>
          )}

          <h1 className="article-headline">{headline}</h1>

          {summary && <blockquote className="article-summary">{summary}</blockquote>}

          {body && (
            <>
              <div className="divider" />
              <div
                className="article-body"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body) }}
              />
            </>
          )}

          <Comments articleId={item.article_id} />
        </>
      )}

      {editing && item && (
        <EditArticleModal
          item={item}
          onClose={() => setEditing(false)}
          onSaved={refetch}
        />
      )}
    </div>
  );
}
