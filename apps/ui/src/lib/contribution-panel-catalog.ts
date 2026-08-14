import type { WidgetCategoryId } from "@nexternel/plugin-sdk";
import type { ContributionPanelCatalogItem } from "@nexternel/domain";
import { listPanelContributions } from "../plugins/registry";

export type { WidgetCategoryId };

export type ContributionPanelEntry = {
  type: string;
  label: string;
  description: string;
  category: WidgetCategoryId;
  needsCapability: boolean;
  sortOrder: number;
  catalogSortOrder?: number;
};

const CONTRIBUTION_SORT_BASE = 1000;

export const PANEL_CATEGORY_GROUPS: {
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
    description: "Clock and system panels",
  },
  {
    id: "plugins",
    label: "More panels",
    description: "Additional contributed panel types",
  },
];

const CATEGORY_ORDER: Record<WidgetCategoryId, number> = {
  status: 0,
  sensors: 1,
  history: 2,
  controls: 3,
  media: 4,
  system: 5,
  plugins: 6,
};

/** Contributed panels — registered in the UI plugin host. */
export function listContributionPanelEntries(): ContributionPanelEntry[] {
  return listPanelContributions()
    .map((p, index) => {
      const meta = p as typeof p & { catalogSortOrder?: number };
      return {
        type: p.type,
        label: p.label,
        description: p.bindingSlots?.length
          ? "Live dial for one sensor — pick temperature, humidity, power, etc."
          : "Contributed panel",
        category: p.category ?? "plugins",
        needsCapability: p.bindingSlots?.length ? false : p.needsCapability !== false,
        catalogSortOrder: meta.catalogSortOrder,
        sortOrder:
          meta.catalogSortOrder ??
          CONTRIBUTION_SORT_BASE +
            (CATEGORY_ORDER[p.category ?? "plugins"] ?? 99) * 10 +
            index,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function contributionPanelsForCatalog(): ContributionPanelCatalogItem[] {
  return listContributionPanelEntries().map((entry) => ({
    source: "contribution" as const,
    type: entry.type,
    label: entry.label,
    description: entry.description,
    sortOrder: entry.sortOrder,
  }));
}

export function getContributionPanelEntry(
  type: string
): ContributionPanelEntry | undefined {
  return listContributionPanelEntries().find((e) => e.type === type);
}

export function defaultContributionPanelSelection(): string | null {
  const entries = listContributionPanelEntries();
  return entries[0]?.type ?? null;
}

/** @deprecated use listContributionPanelEntries */
export const listCatalogEntries = listContributionPanelEntries;

/** @deprecated use getContributionPanelEntry */
export const getCatalogEntry = getContributionPanelEntry;

/** @deprecated use defaultContributionPanelSelection */
export function defaultPluginAddSelection(): {
  category: WidgetCategoryId;
  type: string;
} | null {
  const entries = listContributionPanelEntries();
  if (entries.length === 0) return null;
  const first = entries[0]!;
  return { category: first.category, type: first.type };
}

/** @deprecated use PANEL_CATEGORY_GROUPS */
export const WIDGET_CATEGORIES = PANEL_CATEGORY_GROUPS;

/** @deprecated use listContributionPanelEntries */
export function catalogByCategory(category: WidgetCategoryId): ContributionPanelEntry[] {
  return listContributionPanelEntries().filter((e) => e.category === category);
}

/** @deprecated use PANEL_CATEGORY_GROUPS */
export function categoriesWithEntries(): typeof PANEL_CATEGORY_GROUPS {
  const present = new Set(listContributionPanelEntries().map((e) => e.category));
  return PANEL_CATEGORY_GROUPS.filter((c) => present.has(c.id));
}
