/**
 * Unified dashboard Add Panel catalog — core registry panels plus UI contributions.
 */

export type PanelCatalogSource = "core" | "contribution";

export type CorePanelCatalogItem = {
  source: "core";
  kind: string;
  label: string;
  description: string;
  sortOrder: number;
};

export type ContributionPanelCatalogItem = {
  source: "contribution";
  type: string;
  label: string;
  description: string;
  sortOrder: number;
};

export type UnifiedPanelCatalogItem =
  | CorePanelCatalogItem
  | ContributionPanelCatalogItem;

export function panelCatalogItemId(item: UnifiedPanelCatalogItem): string {
  return item.source === "core" ? item.kind : item.type;
}

/** Dashboard document `type` for built-in capability panels (`panel.*` / legacy `view.*`). */
export function isCorePanelCatalogType(type: string): boolean {
  return type.startsWith("panel.") || type.startsWith("view.");
}

/** Contributed React panels registered in the UI host (`plugin.*`). */
export function isContributionPanelType(type: string): boolean {
  return type.startsWith("plugin.");
}
