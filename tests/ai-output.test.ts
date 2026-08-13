import { describe, expect, it } from "vitest";
import { parseAiOutput } from "../supabase/functions/process-articles/parse.js";

/**
 * The model's output is the least trustworthy input in the whole pipeline:
 * it's free-tier, nondeterministic, and its failures land silently in the
 * database. These cases are the shapes actually seen in the wild.
 */

const valid = {
  teen_headline: "Сургууль дүрмээ өөрчиллөө",
  teen_summary: "Хоёр өгүүлбэр.",
  teen_body: "<p>Гурван догол мөр.</p>",
  mood: "wild",
};

const json = (o: unknown) => JSON.stringify(o);

describe("parseAiOutput", () => {
  it("parses a clean response", () => {
    expect(parseAiOutput(json(valid))).toEqual(valid);
  });

  it("strips ```json fences", () => {
    expect(parseAiOutput("```json\n" + json(valid) + "\n```")).toEqual(valid);
  });

  it("strips bare ``` fences", () => {
    expect(parseAiOutput("```\n" + json(valid) + "\n```")).toEqual(valid);
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseAiOutput("\n\n  " + json(valid) + "  \n")).toEqual(valid);
  });

  it("recovers from literal newlines inside string values", () => {
    // Invalid JSON as-is: a raw newline inside a string. The cleaner flattens it.
    const withNewline = `{"teen_headline":"A","teen_summary":"line one\nline two","teen_body":"<p>B</p>","mood":"heavy"}`;
    const out = parseAiOutput(withNewline);
    expect(out.teen_summary).toBe("line one line two");
    expect(out.mood).toBe("heavy");
  });

  describe("mood validation", () => {
    it("accepts every mood the UI knows", () => {
      for (const mood of ["wild", "heavy", "inspiring", "sus", "lowkey", "chaotic", "important"]) {
        expect(parseAiOutput(json({ ...valid, mood })).mood).toBe(mood);
      }
    });

    it("normalises case and whitespace", () => {
      expect(parseAiOutput(json({ ...valid, mood: "  WILD " })).mood).toBe("wild");
      expect(parseAiOutput(json({ ...valid, mood: "Inspiring" })).mood).toBe("inspiring");
    });

    it("rejects a mood the UI cannot render", () => {
      // Would otherwise be stored and silently displayed as `heavy`.
      expect(() => parseAiOutput(json({ ...valid, mood: "excited" }))).toThrow(/unknown mood/);
    });
  });

  describe("rejects malformed output", () => {
    it("empty content", () => {
      expect(() => parseAiOutput("")).toThrow(/empty/);
      expect(() => parseAiOutput("   ")).toThrow(/empty/);
    });

    it("prose instead of JSON", () => {
      expect(() => parseAiOutput("Sure! Here is the article:")).toThrow(/Failed to parse/);
    });

    it("a JSON array", () => {
      expect(() => parseAiOutput(json([valid]))).toThrow();
    });

    it.each(["teen_headline", "teen_summary", "teen_body", "mood"])(
      "a missing %s",
      (field) => {
        const partial: Record<string, unknown> = { ...valid };
        delete partial[field];
        expect(() => parseAiOutput(json(partial))).toThrow(new RegExp(field));
      },
    );

    it("an empty required field", () => {
      expect(() => parseAiOutput(json({ ...valid, teen_body: "" }))).toThrow(/teen_body/);
    });
  });
});
