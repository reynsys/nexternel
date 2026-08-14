import { normalizePanelKind } from "../../lib/panel-kind";
import type { WidgetInstance } from "../../api";
import {
  loadSelectablePanels,
  panelLabelFromCatalog,
  panelSizeFromCatalog,
  type PanelCatalogEntry,
} from "../../lib/panel-catalog";

let catalogCache: PanelCatalogEntry[] | null = null;

async function ensureCatalog(): Promise<PanelCatalogEntry[]> {
  if (!catalogCache) {
    catalogCache = await loadSelectablePanels();
  }
  return catalogCache;
}

/** Sync helpers use cached catalog when available (after first load). */
const FALLBACK_SIZE = { w: 4, h: 3, minW: 3, minH: 2 };

export function isPanelWidgetType(type: string): boolean {
  const normalized = normalizePanelKind(type);
  return normalized.startsWith("panel.") || type.startsWith("view.");
}

export function panelLabel(type: string): string {
  const kind = normalizePanelKind(type);
  if (catalogCache) {
    return panelLabelFromCatalog(kind, catalogCache);
  }
  const labels: Record<string, string> = {
    "panel.controls": "Controls",
    "panel.status": "Status",
    "panel.charts": "Charts",
    "panel.camera": "Cameras",
    "panel.weather": "Weather",
    "panel.calendar": "Calendar",
    "panel.devices": "Devices",
    "panel.system": "System",
  };
  return labels[kind] ?? "Panel";
}

export function panelDefaultSize(type: string): {
  w: number;
  h: number;
  minW: number;
  minH: number;
} {
  const kind = normalizePanelKind(type);
  if (catalogCache) {
    return panelSizeFromCatalog(kind, catalogCache);
  }
  return FALLBACK_SIZE;
}

export function readPanelScope(widget: WidgetInstance) {
  const raw = widget.config?.panelScope ?? widget.config?.viewScope;
  if (!raw || typeof raw !== "object") return {};
  return raw as {
    inheritSectionArea?: boolean;
    areaIds?: string[];
    systemIds?: string[];
    groupIds?: string[];
    contentMode?: "auto" | "manual";
    capabilityIds?: string[];
    cameraIds?: string[];
  };
}

export function normalizedPanelKind(type: string): string {
  return normalizePanelKind(type);
}

export async function fetchSelectablePanelOptions(): Promise<PanelCatalogEntry[]> {
  const catalog = await ensureCatalog();
  catalogCache = catalog;
  return catalog;
}

export type CorePanelKind = string;

/** @deprecated use CorePanelKind */
export type Phase4PanelKind = CorePanelKind;
