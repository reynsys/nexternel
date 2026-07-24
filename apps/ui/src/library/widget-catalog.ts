import type { WidgetCategoryId } from "@nexternel/plugin-sdk";
import { listWidgetContributions } from "../plugins/registry";
import {
  catalogTypeForPreset,
  listEchartsPresets,
} from "../widgets/echarts";

export type { WidgetCategoryId };

export type CatalogEntry = {
  type: string;
  label: string;
  description: string;
  category: WidgetCategoryId;
  needsCapability: boolean;
  /** When set, instance type is `echarts` with this preset. */
  presetId?: string;
  defaultConfig?: Record<string, unknown>;
};

export const WIDGET_CATEGORIES: {
  id: WidgetCategoryId;
  label: string;
  description: string;
}[] = [
  {
    id: "status",
    label: "Status",
    description: "Stat, badge-style values, quick at-a-glance",
  },
  {
    id: "sensors",
    label: "Sensors",
    description: "ECharts gauges, pie, radar, funnel",
  },
  {
    id: "history",
    label: "History",
    description: "ECharts line / area / bar / scatter / heatmap",
  },
  {
    id: "controls",
    label: "Controls",
    description: "Switches, sliders, locks",
  },
  {
    id: "media",
    label: "Media",
    description: "Camera, image, floorplan (as available)",
  },
  {
    id: "system",
    label: "System",
    description: "Clock, blank ECharts shell, host tools",
  },
  {
    id: "plugins",
    label: "Plugins",
    description: "Third-party and uncategorized plugins",
  },
];

/** Core non-ECharts widget types. */
const CORE_CATALOG: CatalogEntry[] = [
  {
    type: "auto",
    label: "Auto",
    description: "Picks switch or stat from the capability kind",
    category: "status",
    needsCapability: true,
  },
  {
    type: "stat",
    label: "Stat",
    description: "Large numeric or text value",
    category: "status",
    needsCapability: true,
  },
  {
    type: "switch",
    label: "Switch",
    description: "On/off control for a switch capability",
    category: "controls",
    needsCapability: true,
  },
];

function echartsCatalogEntries(): CatalogEntry[] {
  return listEchartsPresets().map((p) => ({
    type: catalogTypeForPreset(p.id),
    label: p.label,
    description: p.description,
    category: p.category,
    needsCapability: p.needsCapability,
    presetId: p.id,
    defaultConfig: {
      presetId: p.id,
      ...(p.dataMode === "history" ? { range: "24h" } : {}),
    },
  }));
}

export function listCatalogEntries(): CatalogEntry[] {
  const plugins: CatalogEntry[] = listWidgetContributions().map((p) => ({
    type: p.type,
    label: p.label,
    description: "Plugin widget",
    category: p.category ?? "plugins",
    needsCapability: p.needsCapability !== false,
  }));
  return [...CORE_CATALOG, ...echartsCatalogEntries(), ...plugins];
}

export function catalogByCategory(category: WidgetCategoryId): CatalogEntry[] {
  return listCatalogEntries().filter((e) => e.category === category);
}

export function getCatalogEntry(type: string): CatalogEntry | undefined {
  return listCatalogEntries().find((e) => e.type === type);
}

/** Categories that currently have at least one widget. */
export function categoriesWithEntries(): typeof WIDGET_CATEGORIES {
  const present = new Set(listCatalogEntries().map((e) => e.category));
  return WIDGET_CATEGORIES.filter((c) => present.has(c.id));
}
