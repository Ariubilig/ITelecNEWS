import { supabase } from "https://esm.sh/@supabase/supabase-js@2";


const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  // Allow manual trigger via POST, or cron trigger
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 1. Fetch articles that have no processed_articles row yet
  const { data: articles, error: fetchError } = await supabase
    .from("articles")
    .select(`
      id, title, body, url,
      processed_articles ( id )
    `)
    .is("processed_articles.id", null)
    .not("body", "is", null)
    // no .limit() — process everything that came in today

  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  if (!articles || articles.length === 0) {
    console.log("No unprocessed articles found.");
    return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
  }

  console.log(`Processing ${articles.length} articles...`);

  const results = { success: 0, failed: 0 };

  for (const article of articles) {
    try {
      const aiOutput = await processWithClaude(article.title, article.body);

      const { error: upsertError } = await supabase
        .from("processed_articles")
        .upsert({
          article_id:      article.id,
          teen_headline:   aiOutput.teen_headline,
          teen_summary:    aiOutput.teen_summary,
          teen_body:       aiOutput.teen_body,
          mood:            aiOutput.mood,
          status:          "draft",
          ai_processed_at: new Date().toISOString(),
        }, { onConflict: "article_id" });

      if (upsertError) throw upsertError;

      results.success++;
      console.log(`✅ Processed: ${article.title}`);

    } catch (err) {
      results.failed++;
      console.error(`❌ Failed article ${article.id}:`, err.message);
    }
  }

  return new Response(JSON.stringify(results), { status: 200 });
});

// ─── Claude call ────────────────────────────────────────────────────────────

async function processWithClaude(title: string, body: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-8b-instruct:free", // free tier
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `TITLE: ${title}\n\nBODY:\n${body}` },
      ],
    }),
  });

  const data = await response.json();
  const raw = data.choices[0].message.content; // OpenRouter uses OpenAI format

  // Strip markdown code fences if Claude wraps in ```json
  const cleaned = raw.replace(/```json\n?|```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  // Validate all fields came back
  const required = ["teen_headline", "teen_summary", "teen_body", "mood"];
  for (const field of required) {
    if (!parsed[field]) throw new Error(`Missing field: ${field}`);
  }

  return parsed;
}

// ─── Prompt ─────────────────────────────────────────────────────────────────

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