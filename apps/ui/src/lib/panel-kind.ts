/** Map legacy `view.*` widget types to current `panel.*` kinds. */
export function normalizePanelKind(kind: string): string {
  if (kind === "view.lighting") return "panel.controls";
  if (kind.startsWith("view.")) return kind.replace(/^view\./, "panel.");
  return kind;
}
