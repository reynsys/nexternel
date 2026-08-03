import { z } from "zod";

/** Grid placement for one widget instance (React Grid Layout compatible). */
export const WidgetLayoutSchema = z.object({
  i: z.string(),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  minW: z.number().int().positive().optional(),
  minH: z.number().int().positive().optional(),
});

export type WidgetLayout = z.infer<typeof WidgetLayoutSchema>;

/** Widget instance — JSON-defined; bound to capabilities. */
export const WidgetInstanceSchema = z.object({
  id: z.string(),
  type: z.string().min(1),
  title: z.string().optional(),
  layout: WidgetLayoutSchema,
  bindings: z.record(z.unknown()).default({}),
  config: z.record(z.unknown()).default({}),
});

export type WidgetInstance = z.infer<typeof WidgetInstanceSchema>;

/** Allowed section widths on a 12-column CSS grid. */
export const SECTION_COL_SPANS = [3, 4, 6, 12] as const;
export type SectionColSpan = (typeof SECTION_COL_SPANS)[number];

export function normalizeSectionColSpan(value: unknown): SectionColSpan {
  if (value === 3 || value === 4 || value === 6 || value === 12) return value;
  return 12;
}

export const DEFAULT_DASHBOARD_TAB_ICON = "dashboard";
export const DEFAULT_SECTION_ICON = "view-module";

/**
 * Layout section — one level between Dashboard and widgets.
 * Optional roomId links to a domain Room later; freeform titles are valid without a room.
 */
export const DashboardSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  order: z.number().int().nonnegative().default(0),
  collapsed: z.boolean().optional().default(false),
  roomId: z.string().nullable().optional(),
  /** Catalog icon id (see UI dashboard-icons). */
  icon: z.string().optional(),
  /** Width on 12-col section grid: 12 full, 6 half, 4 third, 3 quarter. */
  colSpan: z.number().int().optional(),
  widgets: z.array(WidgetInstanceSchema).default([]),
});

export type DashboardSection = z.infer<typeof DashboardSectionSchema>;

/** Current persisted dashboard document (PostgreSQL JSONB). */
export const DashboardDocumentSchema = z.object({
  schemaVersion: z.literal(2),
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  /** Top tab bar icon catalog id. */
  tabIcon: z.string().optional(),
  /** When false, tab shows icon only (tooltip for name). */
  showTabLabel: z.boolean().optional().default(true),
  /** Section quick-jump chips below the tab bar (off by default). */
  showSectionNav: z.boolean().optional().default(false),
  sections: z.array(DashboardSectionSchema).default([]),
});

export type DashboardDocument = z.infer<typeof DashboardDocumentSchema>;

/** Legacy flat document (schemaVersion 1). */
export const DashboardDocumentV1Schema = z.object({
  schemaVersion: z.literal(1).optional(),
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  widgets: z.array(WidgetInstanceSchema).default([]),
});

export const CURRENT_DASHBOARD_SCHEMA_VERSION = 2 as const;

function normalizeSection(
  s: DashboardSection,
  index: number
): DashboardSection {
  return {
    ...s,
    order: typeof s.order === "number" ? s.order : index,
    collapsed: Boolean(s.collapsed),
    icon: typeof s.icon === "string" && s.icon.trim() ? s.icon.trim() : undefined,
    colSpan: normalizeSectionColSpan(s.colSpan),
    widgets: Array.isArray(s.widgets) ? s.widgets : [],
  };
}

export function emptyDashboardDocument(name = "Dashboard"): DashboardDocument {
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

/**
 * Normalize any stored JSONB to schemaVersion 2.
 * v1 (flat widgets) → single "Main" section.
 */
export function migrateDashboardDocument(raw: unknown): DashboardDocument {
  if (!raw || typeof raw !== "object") {
    return emptyDashboardDocument();
  }
  const doc = raw as Record<string, unknown>;
  const name =
    typeof doc.name === "string" && doc.name.trim() ? doc.name.trim() : "Dashboard";
  const tabIcon =
    typeof doc.tabIcon === "string" && doc.tabIcon.trim()
      ? doc.tabIcon.trim()
      : DEFAULT_DASHBOARD_TAB_ICON;
  const showTabLabel = doc.showTabLabel !== false;
  const showSectionNav = doc.showSectionNav === true;

  if (doc.schemaVersion === 2 && Array.isArray(doc.sections)) {
    const parsed = DashboardDocumentSchema.safeParse({
      ...doc,
      name,
      tabIcon,
      showTabLabel,
      showSectionNav,
      schemaVersion: 2,
    });
    if (parsed.success) {
      const sections = [...parsed.data.sections]
        .map((s, i) => normalizeSection(s, i))
        .sort((a, b) => a.order - b.order);
      if (sections.length === 0) {
        return emptyDashboardDocument(name);
      }
      return {
        ...parsed.data,
        name,
        tabIcon,
        showTabLabel,
        showSectionNav,
        sections,
      };
    }
  }

  const widgets = Array.isArray(doc.widgets) ? doc.widgets : [];
  const v1 = DashboardDocumentV1Schema.safeParse({
    schemaVersion: 1,
    name,
    widgets,
  });
  const list = v1.success ? v1.data.widgets : [];

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
        widgets: list,
      },
    ],
  };
}
