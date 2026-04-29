import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";


const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);


Deno.serve(async (req) => {


  const { data: articles, error: fetchError } = await supabase
    .from("articles")
    .select("id, title, body, url")
    .eq("processed", false)
    .not("body", "is", null);

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

  const settled = await Promise.allSettled(
    articles.map((article) => processArticle(article))
  );

  for (const outcome of settled) {
    if (outcome.status === "fulfilled") results.success++;
    else {
      results.failed++;
      console.error("❌ Article failed:", outcome.reason);
    }
  }

  return new Response(JSON.stringify(results), { status: 200 });
});

async function processArticle(article: { id: string; title: string; body: string }) {
  const aiOutput = await processWithAI(article.title, article.body);

  const { error: upsertError } = await supabase
    .from("processed_articles")
    .upsert({
      article_id:      article.id,
      teen_headline:   aiOutput.teen_headline,
      teen_summary:    aiOutput.teen_summary,
      teen_body:       aiOutput.teen_body,
      mood:            aiOutput.mood,
      status:          "draft",
      processed_at: new Date().toISOString(),
    }, { onConflict: "article_id" });

  if (upsertError) throw upsertError;

  const { error: updateError } = await supabase
    .from("articles")
    .update({ processed: true })
    .eq("id", article.id);

  if (updateError) throw updateError;

  console.log(`✅ Processed: ${article.title}`);
}

async function processWithAI(title: string, body: string) {
  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `TITLE: ${title}\n\nBODY:\n${body}` },
        ],
      }),
    });
  } catch (err: unknown) {
    throw new Error(`Network error calling OpenRouter: ${(err as Error).message}`);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "(unreadable body)");
    throw new Error(`OpenRouter HTTP ${response.status}: ${errorText}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("OpenRouter returned non-JSON response");
  }

  const choices = (data as { choices?: { message?: { content?: string } }[] }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error(`OpenRouter returned no choices: ${JSON.stringify(data)}`);
  }

  const raw = choices[0]?.message?.content;
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new Error("OpenRouter choice has empty or missing content");
  }

  let parsed: Record<string, unknown>;
  try {
  const cleaned = raw
    .replace(/```json\n?|```/g, "")
    .replace(/\n/g, " ")   // ← collapse literal newlines inside string values
    .trim();
  parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse AI JSON output: ${raw.slice(0, 200)}`);
  }

  const required = ["teen_headline", "teen_summary", "teen_body", "mood"];
  for (const field of required) {
    if (!parsed[field]) throw new Error(`AI output missing field: ${field}`);
  }

  return parsed as {
    teen_headline: string;
    teen_summary:  string;
    teen_body:     string;
    mood:          string;
  };


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