import useTheme from "../../../hooks/useTheme";

type Theme = "light" | "dark" | "system";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      {(["light", "dark", "system"] as Theme[]).map((t) => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          style={{ fontWeight: theme === t ? 600 : 400 }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}