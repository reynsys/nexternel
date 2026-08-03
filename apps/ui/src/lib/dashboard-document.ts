import type { DashboardDocument, DashboardSection, WidgetInstance } from "../api";
import { migrateWidgetToEcharts, isEchartsWidgetType } from "../widgets/echarts";

export const SECTION_COL_SPANS = [3, 4, 6, 12] as const;
export type SectionColSpan = (typeof SECTION_COL_SPANS)[number];

export const DEFAULT_DASHBOARD_TAB_ICON = "dashboard";
export const DEFAULT_SECTION_ICON = "view-module";

export function normalizeSectionColSpan(value: unknown): SectionColSpan {
  if (value === 3 || value === 4 || value === 6 || value === 12) return value;
  return 12;
}

export function newId(prefix: string): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* LAN HTTP */
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyDocument(name = "Dashboard"): DashboardDocument {
  return {
    schemaVersion: 2,
    name,
    tabIcon: DEFAULT_DASHBOARD_TAB_ICON,
    showTabLabel: true,
    showSectionNav: false,
    sections: [
      {
        id: "section-main",
        title: "Main",
        order: 0,
        collapsed: false,
        icon: DEFAULT_SECTION_ICON,
        colSpan: 12,
        widgets: [],
      },
    ],
  };
}

function normalizeWidget(w: WidgetInstance, index: number): WidgetInstance {
  const id = typeof w.id === "string" && w.id.trim() ? w.id.trim() : newId("widget");
  const raw =
    w.layout && typeof w.layout === "object" && !Array.isArray(w.layout)
      ? w.layout
      : {};
  const layout = {
    i: id,
    x: typeof raw.x === "number" && Number.isFinite(raw.x) ? raw.x : 0,
    y: typeof raw.y === "number" && Number.isFinite(raw.y) ? raw.y : index * 4,
    w: typeof raw.w === "number" && Number.isFinite(raw.w) ? raw.w : 4,
    h: typeof raw.h === "number" && Number.isFinite(raw.h) ? raw.h : 4,
    minW: typeof raw.minW === "number" ? raw.minW : undefined,
    minH: typeof raw.minH === "number" ? raw.minH : undefined,
  };
  const bindings =
    w.bindings && typeof w.bindings === "object" && !Array.isArray(w.bindings)
      ? w.bindings
      : {};
  const type = typeof w.type === "string" && w.type.trim() ? w.type.trim() : "stat";
  const config =
    w.config && typeof w.config === "object" && !Array.isArray(w.config) ? w.config : {};
  const base: WidgetInstance = {
    ...w,
    id,
    type,
    layout,
    bindings,
    config,
  };
  return isEchartsWidgetType(base.type) ? migrateWidgetToEcharts(base) : base;
}

function migrateWidgets(widgets: WidgetInstance[]): WidgetInstance[] {
  return widgets.map((w, i) => normalizeWidget(w, i));
}

function normalizeSection(s: DashboardSection, i: number): DashboardSection {
  return {
    id: s.id || newId("section"),
    title: s.title || `Section ${i + 1}`,
    order: typeof s.order === "number" ? s.order : i,
    collapsed: Boolean(s.collapsed),
    roomId: s.roomId ?? null,
    icon:
      typeof s.icon === "string" && s.icon.trim()
        ? s.icon.trim()
        : DEFAULT_SECTION_ICON,
    colSpan: normalizeSectionColSpan(s.colSpan),
    widgets: migrateWidgets(Array.isArray(s.widgets) ? s.widgets : []),
  };
}

/** Normalize API payload (v1 or v2) to schemaVersion 2. */
export function normalizeDocument(raw: unknown, fallbackName = "Dashboard"): DashboardDocument {
  if (!raw || typeof raw !== "object") return emptyDocument(fallbackName);
  const doc = raw as Record<string, unknown>;
  const fromDoc =
    typeof doc.name === "string" && doc.name.trim() ? doc.name.trim() : "";
  const fromFallback = typeof fallbackName === "string" ? fallbackName.trim() : "";
  // Prefer the DB/dashboard row name (tab bar source of truth) when provided.
  const name = fromFallback || fromDoc || "Dashboard";
  const tabIcon =
    typeof doc.tabIcon === "string" && doc.tabIcon.trim()
      ? doc.tabIcon.trim()
      : DEFAULT_DASHBOARD_TAB_ICON;
  const showTabLabel = doc.showTabLabel !== false;
  const showSectionNav = doc.showSectionNav === true;

  if (doc.schemaVersion === 2 && Array.isArray(doc.sections)) {
    const sections = (doc.sections as DashboardSection[])
      .map((s, i) => normalizeSection(s, i))
      .sort((a, b) => a.order - b.order);
    if (sections.length === 0) return emptyDocument(name);
    return { schemaVersion: 2, name, tabIcon, showTabLabel, showSectionNav, sections };
  }

  const widgets = migrateWidgets(
    Array.isArray(doc.widgets) ? (doc.widgets as WidgetInstance[]) : []
  );
  return {
    schemaVersion: 2,
    name,
    tabIcon,
    showTabLabel,
    showSectionNav,
    sections: [
      {
        id: "section-main",
        title: "Main",
        order: 0,
        collapsed: false,
        icon: DEFAULT_SECTION_ICON,
        colSpan: 12,
        widgets,
      },
    ],
  };
}

export function nextWidgetY(widgets: WidgetInstance[]): number {
  if (widgets.length === 0) return 0;
  return Math.max(...widgets.map((w) => w.layout.y + w.layout.h));
}

/** Place next widget to the right when space remains, else next row. */
export function nextWidgetPlacement(
  widgets: WidgetInstance[],
  w: number,
  cols = 12
): { x: number; y: number } {
  if (widgets.length === 0) return { x: 0, y: 0 };
  const byRow = new Map<number, WidgetInstance[]>();
  for (const widget of widgets) {
    const row = widget.layout.y;
    const list = byRow.get(row) ?? [];
    list.push(widget);
    byRow.set(row, list);
  }
  const rows = [...byRow.keys()].sort((a, b) => a - b);
  for (const row of rows) {
    const rowWidgets = byRow.get(row)!;
    const maxRight = Math.max(...rowWidgets.map((x) => x.layout.x + x.layout.w));
    if (maxRight + w <= cols) {
      return { x: maxRight, y: row };
    }
  }
  return { x: 0, y: nextWidgetY(widgets) };
}

export function sortSections(sections: DashboardSection[]): DashboardSection[] {
  return [...sections].sort((a, b) => a.order - b.order);
}

export function sectionColSpanLabel(span: SectionColSpan): string {
  switch (span) {
    case 12:
      return "Full";
    case 6:
      return "Half";
    case 4:
      return "Third";
    case 3:
      return "Quarter";
    default:
      return "Full";
  }
}
