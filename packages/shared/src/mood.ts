export interface MoodStyle {
  label: string;
  color: string;
  bg: string;
  border: string;
}

export const MOOD_CONFIG: Record<string, MoodStyle> = {
  wild:      { label: "Гайхмаар",         color: "#ff6b35", bg: "rgba(255,107,53,0.12)",  border: "rgba(255,107,53,0.35)" },
  heavy:     { label: "Хүнд",             color: "#a8b5c8", bg: "rgba(168,181,200,0.10)", border: "rgba(168,181,200,0.28)" },
  inspiring: { label: "Урамдуулах",       color: "#f5c842", bg: "rgba(245,200,66,0.10)",  border: "rgba(245,200,66,0.30)" },
  sus:       { label: "Эргэлзээтэй",      color: "#c084fc", bg: "rgba(192,132,252,0.10)", border: "rgba(192,132,252,0.30)" },
  lowkey:    { label: "Намуун",           color: "#6ee7b7", bg: "rgba(110,231,183,0.10)", border: "rgba(110,231,183,0.28)" },
  chaotic:   { label: "Эмх замбараагүй", color: "#fb923c", bg: "rgba(251,146,60,0.10)",  border: "rgba(251,146,60,0.30)" },
  important: { label: "Чухал",            color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.30)" },
};

export function getMoodStyle(mood: string | undefined): MoodStyle {
  const fallback = MOOD_CONFIG.heavy!;
  if (!mood) return fallback;
  return MOOD_CONFIG[mood.toLowerCase().trim()] ?? fallback;
}
