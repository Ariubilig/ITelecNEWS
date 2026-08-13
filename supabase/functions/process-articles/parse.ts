/**
 * Parsing and validation of the model's raw response.
 *
 * Deliberately free of imports and of any Deno API, so the most failure-prone
 * code in the pipeline can be unit-tested outside the edge runtime
 * (see tests/ai-output.test.ts).
 */

export type AiOutput = {
  teen_headline: string;
  teen_summary: string;
  teen_body: string;
  mood: string;
};

const REQUIRED_FIELDS = [
  "teen_headline",
  "teen_summary",
  "teen_body",
  "mood",
] as const;

/**
 * Must stay in sync with MOOD_CONFIG in packages/shared/src/mood.ts. The web
 * app silently renders anything unrecognised as `heavy`, so without this check
 * a drifting model would quietly turn the whole feed grey.
 */
export const VALID_MOODS: ReadonlySet<string> = new Set([
  "wild", "heavy", "inspiring", "sus", "lowkey", "chaotic", "important",
]);

/**
 * Turn the model's message content into a validated {@link AiOutput}.
 * Throws on anything malformed so the caller's retry loop can ask again.
 */
export function parseAiOutput(raw: string): AiOutput {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("AI returned empty content");
  }

  // Models wrap JSON in ```json fences, and put literal newlines inside string
  // values, which is invalid JSON. Strip the fences and flatten the newlines.
  const cleaned = raw.replace(/```json\n?|```/g, "").replace(/\n/g, " ").trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse AI JSON output: ${raw.slice(0, 200)}`);
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("AI output was not a JSON object");
  }

  for (const field of REQUIRED_FIELDS) {
    if (!parsed[field]) throw new Error(`AI output missing field: ${field}`);
  }

  // Case and whitespace are forgiven; an unknown mood is not. Throwing lets the
  // retry loop ask again rather than persisting a value the UI can only render
  // as the `heavy` fallback.
  const mood = String(parsed.mood).toLowerCase().trim();
  if (!VALID_MOODS.has(mood)) {
    throw new Error(`AI returned unknown mood: ${JSON.stringify(parsed.mood)}`);
  }

  return { ...(parsed as unknown as AiOutput), mood };
}
