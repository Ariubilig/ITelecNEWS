import { useState } from "react";
import { createPortal } from "react-dom";
import { MOOD_CONFIG } from "@itelecnews/shared";
import type { EditForm, ProcessedArticle } from "@itelecnews/shared";
import { supabase } from "../../lib/supabase";

interface Props {
  item: ProcessedArticle;
  onClose: () => void;
  onSaved: () => void;
}

const initialForm = (item: ProcessedArticle): EditForm => ({
  teen_headline: item.teen_headline ?? "",
  teen_summary:  item.teen_summary  ?? "",
  teen_body:     item.teen_body     ?? "",
  mood:          item.mood          ?? "heavy",
  status:        item.status        ?? "published",
  image:         item.articles?.image ?? "",
});

export default function EditArticleModal({ item, onClose, onSaved }: Props) {
  const [form, setForm] = useState<EditForm>(() => initialForm(item));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setField = <K extends keyof EditForm>(key: K, value: EditForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function save() {
    setSaving(true);
    setError("");

    const { error: pErr } = await supabase.from("processed_articles").update({
      teen_headline: form.teen_headline,
      teen_summary:  form.teen_summary,
      teen_body:     form.teen_body,
      mood:          form.mood,
      status:        form.status,
    }).eq("id", item.id);

    const { error: aErr } = pErr || !item.article_id
      ? { error: null }
      : await supabase.from("articles").update({ image: form.image }).eq("id", item.article_id);

    setSaving(false);

    if (pErr || aErr) {
      setError("Хадгалахад алдаа гарлаа. Дахин оролдоно уу.");
      return;
    }
    onSaved();
    onClose();
  }

  return createPortal(
    <div className="edit-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="edit-panel">
        <h2 className="edit-title">Мэдээ засах</h2>

        <label className="edit-label">Гарчиг</label>
        <input
          className="edit-input"
          value={form.teen_headline}
          onChange={(e) => setField("teen_headline", e.target.value)}
        />

        <label className="edit-label">Хураангуй</label>
        <textarea
          className="edit-textarea"
          rows={3}
          value={form.teen_summary}
          onChange={(e) => setField("teen_summary", e.target.value)}
        />

        <label className="edit-label">Агуулга (HTML)</label>
        <textarea
          className="edit-textarea"
          rows={10}
          value={form.teen_body}
          onChange={(e) => setField("teen_body", e.target.value)}
        />

        <label className="edit-label">Зурагны URL</label>
        <input
          className="edit-input"
          placeholder="https://..."
          value={form.image}
          onChange={(e) => setField("image", e.target.value)}
        />

        <div className="edit-row">
          <div className="edit-col">
            <label className="edit-label">Сэтгэл</label>
            <select
              className="edit-select"
              value={form.mood}
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
              value={form.status}
              onChange={(e) => setField("status", e.target.value)}
            >
              <option value="published">Нийтлэгдсэн</option>
              <option value="draft">Хүлээгдэж байна</option>
              <option value="rejected">Татгалзсан</option>
            </select>
          </div>
        </div>

        {error && <p className="edit-error">{error}</p>}

        <div className="edit-actions">
          <button className="edit-btn-ghost" onClick={onClose} disabled={saving}>
            Болих
          </button>
          <button className="edit-btn-primary" onClick={save} disabled={saving}>
            {saving ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
