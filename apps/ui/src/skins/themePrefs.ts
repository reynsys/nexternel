/** Browser prefs for Theme Configurator (not Soft UI Pro — our own). */

export const THEME_PREFS_KEY = "nexternel.themePrefs";

export type ThemeMode = "light" | "dark";

export type ThemePrefs = {
  mode: ThemeMode;
  /** Primary accent hex */
  primary: string;
};

export const PRIMARY_SWATCHES: { id: string; label: string; color: string }[] = [
  { id: "blue", label: "Blue", color: "#1A73E8" },
  { id: "info", label: "Info", color: "#49a3f1" },
  { id: "success", label: "Success", color: "#66BB6A" },
  { id: "warning", label: "Warning", color: "#FFA726" },
  { id: "error", label: "Error", color: "#EF5350" },
  { id: "dark", label: "Dark", color: "#344767" },
];

export const DEFAULT_THEME_PREFS: ThemePrefs = {
  mode: "dark",
  primary: PRIMARY_SWATCHES[0]!.color,
};

export function getThemePrefs(): ThemePrefs {
  try {
    const raw = localStorage.getItem(THEME_PREFS_KEY);
    if (!raw) return { ...DEFAULT_THEME_PREFS };
    const parsed = JSON.parse(raw) as Partial<ThemePrefs>;
    return {
      mode: parsed.mode === "light" ? "light" : "dark",
      primary:
        typeof parsed.primary === "string" && /^#[0-9A-Fa-f]{6}$/.test(parsed.primary)
          ? parsed.primary
          : DEFAULT_THEME_PREFS.primary,
    };
  } catch {
    return { ...DEFAULT_THEME_PREFS };
  }
}

export function setThemePrefs(prefs: ThemePrefs): void {
  localStorage.setItem(THEME_PREFS_KEY, JSON.stringify(prefs));
}
