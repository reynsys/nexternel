import type { WidgetCategoryId } from "@nexternel/plugin-sdk";
import { listWidgetContributions } from "../plugins/registry";
import {
  catalogTypeForPreset,
  getEchartsPreset,
  listEchartsFamilyMeta,
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
    description: "Live ECharts gauges, pie, radar, funnel",
  },
  {
    id: "history",
    label: "Charts (history)",
    description: "ECharts line, area, bar, scatter, heatmap from history",
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
    description: "Clock, calendar, weather, host & device status",
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
  {
    type: "calendar",
    label: "Calendar",
    description: "Month view with today highlighted",
    category: "system",
    needsCapability: false,
  },
  {
    type: "weather",
    label: "Weather",
    description: "Live temperature, humidity, wind and forecast (Open-Meteo)",
    category: "system",
    needsCapability: false,
    defaultConfig: {
      weatherLocation: "London",
      weatherLat: 51.5074,
      weatherLon: -0.1278,
    },
  },
  {
    type: "system_info",
    label: "System information",
    description: "Server version, uptime, CPU%, RAM%, temperature",
    category: "system",
    needsCapability: false,
  },
  {
    type: "device_status",
    label: "Device status",
    description: "Online / offline ESPHome devices by area",
    category: "system",
    needsCapability: false,
    defaultConfig: { offlineOnly: false },
  },
  {
    type: "camera",
    label: "Camera live stream",
    description: "CCTV live view via go2rtc (HLS)",
    category: "media",
    needsCapability: false,
    defaultConfig: { cameraId: "" },
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

/** Group catalog entries by ECharts family (for Add-widget Type menu). */
export function groupCatalogByEchartsFamily(
  entries: CatalogEntry[]
): { familyLabel: string; familyHint: string; entries: CatalogEntry[] }[] {
  const byFamily = new Map<string, CatalogEntry[]>();
  const nonEcharts: CatalogEntry[] = [];

  for (const e of entries) {
    if (!e.presetId) {
      nonEcharts.push(e);
      continue;
    }
    const preset = getEchartsPreset(e.presetId);
    const list = byFamily.get(preset.family) ?? [];
    list.push(e);
    byFamily.set(preset.family, list);
  }

  const groups = listEchartsFamilyMeta()
    .filter((f) => byFamily.has(f.id))
    .map((f) => ({
      familyLabel: f.label,
      familyHint: f.hint,
      entries: byFamily.get(f.id)!,
    }));

  if (nonEcharts.length > 0) {
    groups.unshift({
      familyLabel: "Core",
      familyHint: "Built-in non-ECharts widgets",
      entries: nonEcharts,
    });
  }

  return groups;
}

export function listCatalogEntries(): CatalogEntry[] {
  const plugins: CatalogEntry[] = listWidgetContributions().map((p) => ({
    type: p.type,
    label: p.label,
    description: p.bindingSlots?.length
      ? "Composite widget — multiple capability bindings"
      : "Plugin widget",
    category: p.category ?? "plugins",
    needsCapability: p.bindingSlots?.length ? false : p.needsCapability !== false,
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
