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

/**
 * Layout section — one level between Dashboard and widgets.
 * Optional roomId links to a domain Room later; freeform titles are valid without a room.
 */
export const DashboardSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  order: z.number().int().nonnegative().default(0),
  collapsed: z.boolean().optional().default(false),
  roomId: z.string().uuid().nullable().optional(),
  widgets: z.array(WidgetInstanceSchema).default([]),
});

export type DashboardSection = z.infer<typeof DashboardSectionSchema>;

/** Current persisted dashboard document (PostgreSQL JSONB). */
export const DashboardDocumentSchema = z.object({
  schemaVersion: z.literal(2),
  id: z.string().uuid().optional(),
  name: z.string().min(1),
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

export function emptyDashboardDocument(name = "Dashboard"): DashboardDocument {
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

  if (doc.schemaVersion === 2 && Array.isArray(doc.sections)) {
    const parsed = DashboardDocumentSchema.safeParse({
      ...doc,
      name,
      schemaVersion: 2,
    });
    if (parsed.success) {
      const sections = [...parsed.data.sections].sort((a, b) => a.order - b.order);
      if (sections.length === 0) {
        return emptyDashboardDocument(name);
      }
      return { ...parsed.data, name, sections };
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
    sections: [
      {
        id: "section-main",
        title: "Main",
        order: 0,
        collapsed: false,
        widgets: list,
      },
    ],
  };
}
