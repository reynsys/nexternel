import type {
  CorePanelCatalogItem,
  UnifiedPanelCatalogItem,
} from "@nexternel/domain";
import { loadSelectablePanels, type PanelCatalogEntry } from "./panel-catalog";
import { contributionPanelsForCatalog } from "./contribution-panel-catalog";

export type { UnifiedPanelCatalogItem };

function mapCoreEntry(entry: PanelCatalogEntry): CorePanelCatalogItem {
  return {
    source: "core",
    kind: entry.kind,
    label: entry.label,
    description: entry.description,
    sortOrder: entry.sortOrder,
  };
}

/** Core registry panels plus UI-registered contribution panels for Add Panel. */
export async function loadAddPanelCatalog(): Promise<UnifiedPanelCatalogItem[]> {
  const [core, contributions] = await Promise.all([
    loadSelectablePanels(),
    Promise.resolve(contributionPanelsForCatalog()),
  ]);
  return [...core.map(mapCoreEntry), ...contributions].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

export function findAddPanelCatalogItem(
  catalog: UnifiedPanelCatalogItem[],
  typeId: string
): UnifiedPanelCatalogItem | undefined {
  return catalog.find((item) =>
    item.source === "core" ? item.kind === typeId : item.type === typeId
  );
}
