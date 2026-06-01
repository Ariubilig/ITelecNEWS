import './Reading.css'
import { supabase } from "../../lib/supabase";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { useParams, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { getMoodStyle, MOOD_CONFIG } from "@itelecnews/shared";
import type { Article, ProcessedArticle, EditForm } from "@itelecnews/shared";

import BackIcon    from "../../assets/back.svg";
import CommentIcon from "../../assets/comment.svg";
import LinkIcon    from "../../assets/link.svg";
import EditIcon    from "../../assets/edit.svg";

import Comments from '../../components/comment/Comment';


function getImageUrl(article: Article | undefined) {
  return article?.image ?? null;
}


export default function Reading() {

  const { id }      = useParams();
  const navigate    = useNavigate();
  const contentRef  = useRef<HTMLDivElement>(null);

  const [item,     setItem]     = useState<ProcessedArticle | null>(null);
  const [loaded,   setLoaded]   = useState(false);
  const [fabLeft,  setFabLeft]  = useState<number | null>(null);
  const [isAdmin,  setIsAdmin]  = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const smoother = ScrollSmoother.get();
    if (editing) {
      const pos = smoother?.scrollTop() ?? 0;
      smoother?.paused(true);
      smoother?.scrollTop(pos);
    } else {
      smoother?.paused(false);
    }
    return () => { ScrollSmoother.get()?.paused(false); };
  }, [editing]);
  const [editForm, setEditForm] = useState<EditForm>({
    teen_headline: "",
    teen_summary:  "",
    teen_body:     "",
    mood:          "heavy",
    status:        "published",
    image:         "",
  });

  const fetchArticle = useCallback(async () => {
    const { data } = await supabase
      .from("processed_articles")
      .select(`*, articles(*)`)
      .eq("id", id)
      .single();
    return data as ProcessedArticle | null;
  }, [id]);

  useEffect(() => {
    let active = true;
    fetchArticle().then((data) => {
      if (!active) return;
      setItem(data);
      setLoaded(true);
    });
    return () => { active = false; };
  }, [fetchArticle]);

  // Snapshot the current item into the edit form when the editor opens, so
  // edits always start from the latest fetched values.
  function openEditor() {
    if (!item) return;
    setEditForm({
      teen_headline: item.teen_headline ?? "",
      teen_summary:  item.teen_summary  ?? "",
      teen_body:     item.teen_body     ?? "",
      mood:          item.mood          ?? "heavy",
      status:        item.status        ?? "published",
      image:         item.articles?.image ?? "",
    });
    setSaveError("");
    setEditing(true);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAdmin(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAdmin(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

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

  const article  = item?.articles;
  const imageUrl = getImageUrl(article);
  const mood     = getMoodStyle(item?.mood);
  const headline = item?.teen_headline || article?.title || "Гарчиг байхгүй";
  const summary  = item?.teen_summary;
  const body     = item?.teen_body || article?.body;

  function handleOpenLink() {
    if (article?.url) window.open(article.url, "_blank", "noopener,noreferrer");
  }

  function handleScrollToComments() {
    document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" });
  }

  function setField<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!item) return;
    setSaving(true);
    setSaveError("");

    const { error: pErr } = await supabase.from("processed_articles").update({
      teen_headline: editForm.teen_headline,
      teen_summary:  editForm.teen_summary,
      teen_body:     editForm.teen_body,
      mood:          editForm.mood,
      status:        editForm.status,
    }).eq("id", item.id);

    let aErr = null;
    if (!pErr && item.article_id) {
      ({ error: aErr } = await supabase.from("articles").update({
        image: editForm.image,
      }).eq("id", item.article_id));
    }

    if (pErr || aErr) {
      setSaving(false);
      setSaveError("Хадгалахад алдаа гарлаа. Дахин оролдоно уу.");
      return;
    }

    const data = await fetchArticle();
    setItem(data);
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="reading-root" ref={contentRef}>

      {/* Floating action buttons */}
      <div
        className="fab-panel"
        style={fabLeft != null ? { left: fabLeft } : undefined}
      >
        <button className="fab-btn" onClick={() => navigate(-1)} aria-label="Буцах">
          <img src={BackIcon} className="fab-icon" alt="" />
        </button>

        <div className="fab-divider" />

        <button
          className="fab-btn"
          onClick={handleScrollToComments}
          aria-label="Сэтгэгдэл"
        >
          <img src={CommentIcon} className="fab-icon" alt="" />
        </button>

        <div className="fab-divider" />

        <button className="fab-btn" onClick={handleOpenLink} aria-label="Эх сурвалж нээх">
          <img src={LinkIcon} className="fab-icon" alt="" />
        </button>

        {isAdmin && (
          <>
            <div className="fab-divider" />
            <button
              className="fab-btn fab-btn--edit"
              onClick={openEditor}
              aria-label="Засах"
            >
              <img src={EditIcon} className="fab-icon" alt="" />
            </button>
          </>
        )}
      </div>

      {loaded && !item && (
        <div className="reading-empty">Мэдээ олдсонгүй.</div>
      )}

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
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (img.parentElement) img.parentElement.style.display = "none";
                }}
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
              <div
                className="article-body"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body) }}
              />
            </>
          )}

          <Comments articleId={item.article_id} />
        </>
      )}

      {/* ── Edit modal ──────────────────────────────────────── */}
      {editing && createPortal(
        <div className="edit-overlay" onClick={(e) => e.target === e.currentTarget && setEditing(false)}>
          <div className="edit-panel">
            <h2 className="edit-title">Мэдээ засах</h2>

            <label className="edit-label">Гарчиг</label>
            <input
              className="edit-input"
              value={editForm.teen_headline}
              onChange={(e) => setField("teen_headline", e.target.value)}
            />

            <label className="edit-label">Хураангуй</label>
            <textarea
              className="edit-textarea"
              rows={3}
              value={editForm.teen_summary}
              onChange={(e) => setField("teen_summary", e.target.value)}
            />

            <label className="edit-label">Агуулга (HTML)</label>
            <textarea
              className="edit-textarea"
              rows={10}
              value={editForm.teen_body}
              onChange={(e) => setField("teen_body", e.target.value)}
            />

            <label className="edit-label">Зурагны URL</label>
            <input
              className="edit-input"
              placeholder="https://..."
              value={editForm.image}
              onChange={(e) => setField("image", e.target.value)}
            />

            <div className="edit-row">
              <div className="edit-col">
                <label className="edit-label">Сэтгэл</label>
                <select
                  className="edit-select"
                  value={editForm.mood}
                  onChange={(e) => setField("mood", e.target.value)}
                >
                  {Object.entries(MOOD_CONFIG).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
              <div className="edit-col">
                <label className="edit-label">Төлөв</label>
                <select
                  className="edit-select"
                  value={editForm.status}
                  onChange={(e) => setField("status", e.target.value)}
                >
                  <option value="published">Нийтлэгдсэн</option>
                  <option value="draft">Хүлээгдэж байна</option>
                  <option value="rejected">Татгалзсан</option>
                </select>
              </div>
            </div>

            {saveError && <p className="edit-error">{saveError}</p>}

            <div className="edit-actions">
              <button className="edit-btn-ghost" onClick={() => setEditing(false)} disabled={saving}>
                Болих
              </button>
              <button className="edit-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Хадгалж байна…" : "Хадгалах"}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
