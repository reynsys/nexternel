/** Shared normalize/parse for users.theme_prefs JSON. */

export type ThemePrefsDto = {
  mode: "light" | "dark";
  primary: string;
  skinId: string;
};

const DEFAULT: ThemePrefsDto = {
  mode: "dark",
  primary: "#1A73E8",
  skinId: "mui-dashboard",
};

const HEX = /^#[0-9A-Fa-f]{6}$/;

export function defaultThemePrefs(): ThemePrefsDto {
  return { ...DEFAULT };
}

/** Accept unknown JSON from DB or request body; return normalized prefs or null if invalid body. */
export function parseThemePrefsInput(
  raw: unknown
): ThemePrefsDto | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const mode = o.mode === "light" ? "light" : o.mode === "dark" ? "dark" : null;
  const primary =
    typeof o.primary === "string" && HEX.test(o.primary) ? o.primary : null;
  const skinId =
    typeof o.skinId === "string" && o.skinId.trim()
      ? o.skinId.trim()
      : null;
  if (!mode || !primary || !skinId) return null;
  return { mode, primary, skinId };
}

export function themePrefsFromDb(raw: unknown): ThemePrefsDto {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaultThemePrefs();
  }
  const o = raw as Record<string, unknown>;
  return {
    mode: o.mode === "light" ? "light" : "dark",
    primary:
      typeof o.primary === "string" && HEX.test(o.primary)
        ? o.primary
        : DEFAULT.primary,
    skinId:
      typeof o.skinId === "string" && o.skinId.trim()
        ? o.skinId.trim()
        : DEFAULT.skinId,
  };
}
