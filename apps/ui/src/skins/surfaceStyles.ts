import { alpha, type Theme } from "@mui/material/styles";
import { gradientCss } from "./gradientPalettes";
import type { ThemePrefs } from "./themePrefs";

export function isGradientActive(prefs: Pick<ThemePrefs, "gradientId">): boolean {
  return Boolean(gradientCss(prefs.gradientId));
}

/**
 * Chrome surfaces (side menu, dashboard section shells) — fully clear so the
 * fixed page gradient shows through.
 */
export function chromeSurfaceSx(gradientActive: boolean) {
  if (!gradientActive) {
    return { bgcolor: "background.paper" as const };
  }
  return {
    bgcolor: "transparent",
    backgroundImage: "none",
  };
}

/** Shared frosted / solid styles for cards, widgets, accordions. */
export function contentPanelStyles(
  theme: Theme,
  opts: { gradientActive: boolean; solidContentPanels: boolean }
) {
  if (!opts.gradientActive || opts.solidContentPanels) {
    return {
      backgroundColor: theme.palette.background.paper,
      backgroundImage: "none",
      backdropFilter: "none",
      WebkitBackdropFilter: "none",
    };
  }
  return {
    backgroundColor: alpha(
      theme.palette.background.paper,
      theme.palette.mode === "dark" ? 0.42 : 0.55
    ),
    backgroundImage: "none",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  };
}

/**
 * Content cards / widgets — frosted over the gradient, or solid light/dark
 * when Appearance → “Solid content panels” is on.
 */
export function contentSurfaceSx(
  gradientActive: boolean,
  solidContentPanels = false
) {
  if (!gradientActive || solidContentPanels) {
    return { bgcolor: "background.paper" as const };
  }
  return {
    bgcolor: (t: Theme) =>
      alpha(t.palette.background.paper, t.palette.mode === "dark" ? 0.42 : 0.55),
    backgroundImage: "none",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  };
}
