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
const MOODS: Record<string, [label: string, color: string, bgA: number, borderA: number]> = {
  wild:      ["Гайхмаар",         "#ff6b35", 0.12, 0.35],
  heavy:     ["Хүнд",             "#a8b5c8", 0.10, 0.28],
  inspiring: ["Урамдуулах",       "#f5c842", 0.10, 0.30],
  sus:       ["Эргэлзээтэй",      "#c084fc", 0.10, 0.30],
  lowkey:    ["Намуун",           "#6ee7b7", 0.10, 0.28],
  chaotic:   ["Эмх замбараагүй",  "#fb923c", 0.10, 0.30],
  important: ["Чухал",            "#f87171", 0.10, 0.30],
};

/** Built once at module load; the `style` objects are stable references. */
export const MOOD_CONFIG: Record<string, MoodStyle> = Object.fromEntries(
  Object.entries(MOODS).map(([key, [label, color, bgA, borderA]]) => [
    key,
    { label, style: { color, background: alpha(color, bgA), borderColor: alpha(color, borderA) } },
  ]),
);

const FALLBACK = MOOD_CONFIG.heavy!;

/** Styling for a mood key. Unknown or missing moods fall back to `heavy`. */
export const getMoodStyle = (mood: string | undefined): MoodStyle =>
  (mood ? MOOD_CONFIG[mood.toLowerCase().trim()] : undefined) ?? FALLBACK;
