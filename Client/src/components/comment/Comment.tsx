import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { timeAgo, buildTree } from "../../utility/Comment";
import "./Comment.css";


//////////////////////////////////////////////////
function useComments(articleId) {
  const [tree, setTree] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data = [] } = await supabase
      .from("comments")
      .select("*")
      .eq("article_id", articleId)
      .eq("status", "published")
      .order("created_at", { ascending: true });

    setTotal(data.length);
    setTree(buildTree(data));
    setLoading(false);
  };

  useEffect(() => { if (articleId) load(); }, [articleId]);

  return { tree, total, loading, load };
}
//////////////////////////////////////////////////


function ComposeForm({ articleId, parentId, onPosted, onCancel, autoFocus }) {
  const [name, setName] = useState(() => localStorage.getItem("cmt_name") ?? "");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const textRef = useRef(null);

  useEffect(() => { if (autoFocus) textRef.current?.focus(); }, [autoFocus]);

  const handleSubmit = async () => {
    const trimName = name.trim();
    const trimText = text.trim();
    if (!trimName) return setError("Нэрээ бичнэ үү.");
    if (!trimText) return setError("Сэтгэгдэл хоосон байна.");

    setError("");
    setBusy(true);

    const { error: dbError } = await supabase.from("comments").insert({
      article_id: articleId,
      guest_name: trimName,
      content: trimText,
      status: "published",
      ...(parentId ? { parent_id: parentId } : {}),
    });

    setBusy(false);

    if (dbError) return setError("Алдаа гарлаа. Дахин оролдоно уу.");

    localStorage.setItem("cmt_name", trimName);
    setText("");
    onPosted();
  };

  return (
    <div className="cmt-compose">
      <input
        className="cmt-input"
        placeholder="Нэр"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
      />
      <textarea
        ref={textRef}
        className="cmt-textarea"
        placeholder={parentId ? "Хариу бичих…" : "Сэтгэгдэл бичих…"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={1000}
      />
      {error && <p className="cmt-err">{error}</p>}
      <div className="cmt-compose-actions">
        {onCancel && (
          <button className="cmt-btn-ghost" onClick={onCancel} disabled={busy}>
            Болих
          </button>
        )}
        <button className="cmt-btn-primary" onClick={handleSubmit} disabled={busy}>
          {busy ? "Илгээж байна…" : "Илгээх"}
        </button>
      </div>
    </div>
  );
}


function CommentCard({ comment, replyTo, onReply, onPosted, articleId, depth = 0 }) {
  const isReplying = replyTo === comment.id;

  return (
    <div className={`cmt-card depth-${Math.min(depth, 2)}`}>
      <div className="cmt-avatar">{comment.guest_name?.[0]?.toUpperCase() ?? "?"}</div>

      <div className="cmt-body">
        <div className="cmt-meta">
          <span className="cmt-name">{comment.guest_name}</span>
          <span className="cmt-dot" />
          <span className="cmt-time">{timeAgo(comment.created_at)}</span>
        </div>

        <p className="cmt-text">{comment.content}</p>

        <button className="cmt-reply-btn" onClick={() => onReply(isReplying ? null : comment.id)}>
          {isReplying ? "Болих" : "Хариу өгөх"}
        </button>

        {isReplying && (
          <ComposeForm
            articleId={articleId}
            parentId={comment.id}
            onPosted={onPosted}
            onCancel={() => onReply(null)}
            autoFocus
          />
        )}
      </div>

      {comment.replies?.length > 0 && (
        <div className="cmt-replies">
          {comment.replies.map((r) => (
            <CommentCard
              key={r.id}
              comment={r}
              replyTo={replyTo}
              onReply={onReply}
              onPosted={onPosted}
              articleId={articleId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}


export default function Comments({ articleId }) {
  const { tree, total, loading, load } = useComments(articleId);
  const [replyTo, setReplyTo] = useState(null);

  if (!articleId) return null;

  const toggleReply = (id) => setReplyTo((prev) => (prev === id ? null : id));
  const handlePosted = () => { setReplyTo(null); load(); };

  return (
    <section className="cmt-root" id="comments">
      <div className="cmt-divider" />

      <div className="cmt-header">
        <h2 className="cmt-title">Сэтгэгдэл</h2>
        {!loading && <span className="cmt-count">{total}</span>}
      </div>

      <ComposeForm articleId={articleId} parentId={null} onPosted={handlePosted} />

      <div className="cmt-divider" />

      {loading ? (
        <div className="cmt-loading"><span /><span /><span /></div>
      ) : tree.length === 0 ? (
        <p className="cmt-empty">Одоохондоо сэтгэгдэл байхгүй. Эхлэгч нь та бай!</p>
      ) : (
        <div className="cmt-list">
          {tree.map((c) => (
            <CommentCard
              key={c.id}
              comment={c}
              replyTo={replyTo}
              onReply={toggleReply}
              onPosted={handlePosted}
              articleId={articleId}
            />
          ))}
        </div>
      )}
    </section>
  );
}