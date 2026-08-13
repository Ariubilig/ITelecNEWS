/** Badge styling for one mood. */
export interface MoodStyle {
  label: string;
  /** Ready to spread into a `style={...}` prop — the three props every badge sets. */
  style: { color: string; background: string; borderColor: string };
}

/** `#rrggbb` + alpha → `rgba(r, g, b, a)`. */
const alpha = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/**
 * Each mood declared once as `[label, accent colour, bg alpha, border alpha]`.
 * The background and border are derived from the accent so the three can't
 * drift apart.
 */
const MOODS = {
  wild:      ["Гайхмаар",         "#ff6b35", 0.12, 0.35],
  heavy:     ["Хүнд",             "#a8b5c8", 0.10, 0.28],
  inspiring: ["Урамдуулах",       "#f5c842", 0.10, 0.30],
  sus:       ["Эргэлзээтэй",      "#c084fc", 0.10, 0.30],
  lowkey:    ["Намуун",           "#6ee7b7", 0.10, 0.28],
  chaotic:   ["Эмх замбараагүй",  "#fb923c", 0.10, 0.30],
  important: ["Чухал",            "#f87171", 0.10, 0.30],
} satisfies Record<string, [label: string, color: string, bgA: number, borderA: number]>;

/** The mood vocabulary. The edge function validates the model's output against
 *  the same set — tests/mood.test.ts is what stops the two copies drifting. */
export type Mood = keyof typeof MOODS;

/** Built once at module load; the `style` objects are stable references. */
export const MOOD_CONFIG = Object.fromEntries(
  Object.entries(MOODS).map(([key, [label, color, bgA, borderA]]) => [
    key,
    { label, style: { color, background: alpha(color, bgA), borderColor: alpha(color, borderA) } },
  ]),
) as Record<Mood, MoodStyle>;

const FALLBACK = MOOD_CONFIG.heavy;

/**
 * Styling for a mood key. The argument stays `string` because the value comes
 * from the database, where nothing constrains it to the union — unknown or
 * missing moods fall back to `heavy` rather than rendering unstyled.
 */
export const getMoodStyle = (mood: string | undefined): MoodStyle => {
  const key = mood?.toLowerCase().trim();
  return key && key in MOOD_CONFIG ? MOOD_CONFIG[key as Mood] : FALLBACK;
};
