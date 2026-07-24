import type { DashboardDocument, DashboardSection, WidgetInstance } from "../api";
import { migrateWidgetToEcharts, isEchartsWidgetType } from "../widgets/echarts";

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
    sections: [
      {
        id: "section-main",
        title: "Main",
        order: 0,
        collapsed: false,
        widgets: [],
      },
    ],
  };
}

function migrateWidgets(widgets: WidgetInstance[]): WidgetInstance[] {
  return widgets.map((w) =>
    isEchartsWidgetType(w.type) ? migrateWidgetToEcharts(w) : w
  );
}

/** Normalize API payload (v1 or v2) to schemaVersion 2. */
export function normalizeDocument(raw: unknown, fallbackName = "Dashboard"): DashboardDocument {
  if (!raw || typeof raw !== "object") return emptyDocument(fallbackName);
  const doc = raw as Record<string, unknown>;
  const name =
    typeof doc.name === "string" && doc.name.trim() ? doc.name.trim() : fallbackName;

  if (doc.schemaVersion === 2 && Array.isArray(doc.sections)) {
    const sections = (doc.sections as DashboardSection[])
      .map((s, i) => ({
        id: s.id || newId("section"),
        title: s.title || `Section ${i + 1}`,
        order: typeof s.order === "number" ? s.order : i,
        collapsed: Boolean(s.collapsed),
        roomId: s.roomId ?? null,
        widgets: migrateWidgets(Array.isArray(s.widgets) ? s.widgets : []),
      }))
      .sort((a, b) => a.order - b.order);
    if (sections.length === 0) return emptyDocument(name);
    return { schemaVersion: 2, name, sections };
  }

  const widgets = migrateWidgets(
    Array.isArray(doc.widgets) ? (doc.widgets as WidgetInstance[]) : []
  );
  return {
    schemaVersion: 2,
    name,
    sections: [
      {
        id: "section-main",
        title: "Main",
        order: 0,
        collapsed: false,
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
