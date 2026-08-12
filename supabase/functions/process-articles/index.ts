import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import pLimit from "https://esm.sh/p-limit@6";
import { parseAiOutput, type AiOutput } from "./parse.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const AI_TIMEOUT_MS    = 60_000;
const AI_MAX_ATTEMPTS  = 3;
const CONCURRENCY      = 3;
// Cap the work per invocation. Article bodies are full HTML, and an edge
// function has a wall-clock budget — an unbounded backlog would load every
// body into memory and then die partway through. The caller re-invokes while
// `remaining` is true.
const BATCH_SIZE       = 20;

// Free models get rate-limited hard and are retired without much notice, so
// fall through a list rather than failing the whole run on one model.
const MODELS = [
  "openai/gpt-oss-120b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
] as const;

type Article = { id: number; title: string; body: string };


Deno.serve(async (req: Request) => {
  // JWT gateway verification is off (verify_jwt = false), so gate with a shared
  // secret only the cron job knows.
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || req.headers.get("x-cron-secret") !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }

  const { data: articles, error: fetchError } = await supabase
    .from("articles")
    .select("id, title, body")
    .eq("processed", false)
    .not("body", "is", null)
    .order("id", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return json({ error: fetchError.message }, 500);
  }
  if (!articles?.length) {
    console.log("No unprocessed articles found.");
    return json({ success: 0, failed: 0, remaining: false });
  }

  console.log(`Processing ${articles.length} articles...`);

  const limit = pLimit(CONCURRENCY);
  const settled = await Promise.allSettled(
    articles.map((a: Article) => limit(() => processArticle(a))),
  );

  const results = { success: 0, failed: 0 };
  for (const o of settled) {
    if (o.status === "fulfilled") results.success++;
    else {
      results.failed++;
      console.error("❌ Article failed:", o.reason);
    }
  }

  // A full batch means there may be more waiting; the caller loops until this
  // is false. Only claim more work is pending if we actually made progress,
  // otherwise a permanently failing article would loop forever.
  const remaining = articles.length === BATCH_SIZE && results.success > 0;

  // 200 on full/partial success; 500 only when every article failed.
  const status = results.success === 0 ? 500 : 200;
  return json({ ...results, remaining }, status);
});


/** Try each model in turn, retrying transient failures within each one. */
async function generate(title: string, body: string): Promise<AiOutput> {
  let lastErr: unknown;
  for (const model of MODELS) {
    try {
      return await withRetry(model, AI_MAX_ATTEMPTS, () => callOpenRouter(model, title, body));
    } catch (err) {
      lastErr = err;
      console.warn(`Model ${model} exhausted, falling back: ${(err as Error).message}`);
    }
  }
  throw lastErr;
}


async function processArticle(article: Article) {
  const ai = await generate(article.title, article.body);

  const { error: upsertError } = await supabase
    .from("processed_articles")
    .upsert({
      article_id:    article.id,
      teen_headline: ai.teen_headline,
      teen_summary:  ai.teen_summary,
      teen_body:     ai.teen_body,
      mood:          ai.mood,
      // Land as a draft; an admin reviews and publishes from the Admin screen.
      status:        "draft",
      processed_at:  new Date().toISOString(),
    }, { onConflict: "article_id" });
  if (upsertError) throw upsertError;

  const { error: updateError } = await supabase
    .from("articles")
    .update({ processed: true })
    .eq("id", article.id);
  if (updateError) throw updateError;

  console.log(`✅ Processed: ${article.title}`);
}


async function callOpenRouter(model: string, title: string, body: string): Promise<AiOutput> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: `TITLE: ${title}\n\nBODY:\n${body}` },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) throw new Error(`OpenRouter timed out after ${AI_TIMEOUT_MS}ms`);
    throw new Error(`Network error calling OpenRouter: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "(unreadable body)");
    throw new Error(`OpenRouter HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json().catch(() => null) as { choices?: { message?: { content?: string } }[] } | null;
  const raw = data?.choices?.[0]?.message?.content;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(`OpenRouter returned no usable content: ${JSON.stringify(data)?.slice(0, 200)}`);
  }

  return parseAiOutput(raw);
}


// Retry with linear backoff. Network errors, timeouts, 5xx, malformed output —
// all worth a retry given the free model's nondeterminism.
async function withRetry<T>(label: string, attempts: number, fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) {
        console.warn(`${label} attempt ${attempt}/${attempts} failed: ${(err as Error).message}`);
        await new Promise((r) => setTimeout(r, attempt * 1500));
      }
    }
  }
  throw lastErr;
}


function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}


const SYSTEM_PROMPT = `
You are a writer for a news site aimed at teenagers aged 13–18.
Your job is to take a raw news article and rewrite it in a way that is:
- Punchy, direct, emotionally engaging — like a smart friend explaining it
- No corporate jargon, no passive voice, no "sources say"
- Real talk — if something is messed up, say it's messed up
- Short sentences. Strong verbs. Concrete details over abstractions.
- NOT dumbed down — teens are smart. Don't be condescending.

Return ONLY valid JSON with exactly these fields (no markdown, no explanation):

{
  "teen_headline": "A punchy rewritten headline, max 12 words",
  "teen_summary": "2-3 sentences. The hook. What happened and why it matters to a teen.",
  "teen_body": "The full rewritten article in HTML. Use <p> tags. 3-5 paragraphs max. Keep the important facts but make it feel human.",
  "mood": "One of: wild | heavy | inspiring | sus | lowkey | chaotic | important"
}
`.trim();
