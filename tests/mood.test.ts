import { describe, expect, it } from "vitest";
import { MOOD_CONFIG, getMoodStyle } from "../packages/shared/src/mood.js";
import { VALID_MOODS } from "../supabase/functions/process-articles/parse.js";

describe("MOOD_CONFIG", () => {
  it("derives background and border from the accent colour", () => {
    const wild = MOOD_CONFIG.wild!;
    expect(wild.style.color).toBe("#ff6b35");
    expect(wild.style.background).toBe("rgba(255, 107, 53, 0.12)");
    expect(wild.style.borderColor).toBe("rgba(255, 107, 53, 0.35)");
  });

  it("gives every mood a label and a complete style", () => {
    for (const [key, mood] of Object.entries(MOOD_CONFIG)) {
      expect(mood.label, key).toBeTruthy();
      expect(mood.style.color, key).toMatch(/^#[0-9a-f]{6}$/i);
      expect(mood.style.background, key).toMatch(/^rgba\(/);
      expect(mood.style.borderColor, key).toMatch(/^rgba\(/);
    }
  });

  it("hands out a stable style object so React can skip re-styling", () => {
    expect(getMoodStyle("wild").style).toBe(getMoodStyle("wild").style);
  });
});

describe("getMoodStyle", () => {
  it("resolves a known mood", () => {
    expect(getMoodStyle("inspiring").label).toBe(MOOD_CONFIG.inspiring!.label);
  });

  it("is case- and whitespace-insensitive", () => {
    expect(getMoodStyle("  WILD ")).toBe(MOOD_CONFIG.wild);
    expect(getMoodStyle("Sus")).toBe(MOOD_CONFIG.sus);
  });

  it.each([undefined, "", "   ", "excited", "null"])(
    "falls back to heavy for %j",
    (input) => {
      expect(getMoodStyle(input as string | undefined)).toBe(MOOD_CONFIG.heavy);
    },
  );
});

/**
 * The edge function validates the model's mood against its own hard-coded set,
 * because a Deno function can't import from packages/shared. That duplication
 * is deliberate — this test is what stops the two copies drifting apart and
 * silently turning the feed grey.
 */
describe("edge function and UI agree on the mood vocabulary", () => {
  it("has identical sets on both sides", () => {
    expect([...VALID_MOODS].sort()).toEqual(Object.keys(MOOD_CONFIG).sort());
  });
});
