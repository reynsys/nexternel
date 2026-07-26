/** Browser prefs for theme / appearance. */

export const THEME_PREFS_KEY = "nexternel.themePrefs";

export type ThemeMode = "light" | "dark";

export type ThemePrefs = {
  mode: ThemeMode;
  /** Primary accent hex */
  primary: string;
  /** Layout skin id (also kept in localStorage for offline boot) */
  skinId?: string;
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
  skinId: "mui-dashboard",
};

export function normalizeThemePrefs(raw: unknown): ThemePrefs {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_THEME_PREFS };
  }
  const parsed = raw as Partial<ThemePrefs>;
  return {
    mode: parsed.mode === "light" ? "light" : "dark",
    primary:
      typeof parsed.primary === "string" && /^#[0-9A-Fa-f]{6}$/.test(parsed.primary)
        ? parsed.primary
        : DEFAULT_THEME_PREFS.primary,
    skinId:
      typeof parsed.skinId === "string" && parsed.skinId.trim()
        ? parsed.skinId.trim()
        : DEFAULT_THEME_PREFS.skinId,
  };
}

export function getThemePrefs(): ThemePrefs {
  try {
    const raw = localStorage.getItem(THEME_PREFS_KEY);
    if (!raw) return { ...DEFAULT_THEME_PREFS };
    return normalizeThemePrefs(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_THEME_PREFS };
  }
}

export function setThemePrefs(prefs: ThemePrefs): void {
  localStorage.setItem(THEME_PREFS_KEY, JSON.stringify(prefs));
}

/** Shape stored on the user account / sent to API. */
export function toAccountThemePrefs(prefs: ThemePrefs, skinId: string) {
  return {
    mode: prefs.mode,
    primary: prefs.primary,
    skinId: prefs.skinId ?? skinId,
  };
}
