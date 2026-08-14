export type PanelAppearanceLayout = "card" | "compact" | "grid";

export function readPanelAppearanceLayout(
  config: Record<string, unknown> | undefined
): PanelAppearanceLayout {
  const appearance = config?.appearance;
  if (appearance && typeof appearance === "object" && !Array.isArray(appearance)) {
    const layout = (appearance as Record<string, unknown>).layout;
    if (layout === "compact" || layout === "grid" || layout === "card") {
      return layout;
    }
  }
  return "card";
}
