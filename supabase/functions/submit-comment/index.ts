import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Rate-limit knobs.
const COOLDOWN_MS    = 15_000; // min gap between posts from one IP
const MAX_PER_HOUR   = 12;     // hourly cap per IP
const NAME_MAX       = 40;
const CONTENT_MAX    = 1000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  let payload: {
    article_id?: number | string;
    guest_name?: string;
    content?: string;
    parent_id?: number | string | null;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const articleId = Number(payload.article_id);
  const guestName = (payload.guest_name ?? "").trim();
  const content   = (payload.content ?? "").trim();
  const parentId  = payload.parent_id != null ? Number(payload.parent_id) : null;

  if (!Number.isFinite(articleId)) return json({ error: "article_id is required" }, 400);
  if (!guestName || guestName.length > NAME_MAX) return json({ error: "Invalid name" }, 400);
  if (!content || content.length > CONTENT_MAX) return json({ error: "Invalid content" }, 400);
  if (parentId != null && !Number.isFinite(parentId)) return json({ error: "Invalid parent_id" }, 400);

  // ── Rate limit ──────────────────────────────────────────────────────────
  const now = Date.now();
  const { data: recent, error: rlErr } = await supabase
    .from("comment_throttle")
    .select("created_at")
    .eq("ip", ip)
    .gte("created_at", new Date(now - 3_600_000).toISOString())
    .order("created_at", { ascending: false });

  if (rlErr) {
    console.error("Throttle lookup failed:", rlErr);
    return json({ error: "Server error" }, 500);
  }

  if (recent && recent.length > 0) {
    const last = new Date(recent[0].created_at).getTime();
    if (now - last < COOLDOWN_MS) {
      return json({ error: "Дэндүү хурдан байна. Түр хүлээгээд дахин оролдоно уу." }, 429);
    }
    if (recent.length >= MAX_PER_HOUR) {
      return json({ error: "Цагийн хязгаарт хүрсэн байна. Дараа дахин оролдоно уу." }, 429);
    }
  }

  // ── Insert ──────────────────────────────────────────────────────────────
  const { error: insertErr } = await supabase.from("comments").insert({
    article_id: articleId,
    guest_name: guestName,
    content,
    status: "published",
    ...(parentId != null ? { parent_id: parentId } : {}),
  });

  if (insertErr) {
    console.error("Comment insert failed:", insertErr);
    return json({ error: "Server error" }, 500);
  }

  // Best-effort throttle record; don't fail the request if it doesn't write.
  await supabase.from("comment_throttle").insert({ ip, article_id: articleId });

  return json({ ok: true }, 201);
});
