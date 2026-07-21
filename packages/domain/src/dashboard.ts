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

/** Widget instance — JSON-defined; bound to capabilities later. */
export const WidgetInstanceSchema = z.object({
  id: z.string(),
  type: z.string().min(1),
  title: z.string().optional(),
  layout: WidgetLayoutSchema,
  /** Capability bindings — opaque in Phase 1; typed later. */
  bindings: z.record(z.unknown()).default({}),
  /** Appearance / type-specific config. */
  config: z.record(z.unknown()).default({}),
});

export type WidgetInstance = z.infer<typeof WidgetInstanceSchema>;

/**
 * Persisted dashboard document (PostgreSQL JSONB).
 * schemaVersion enables forward migrations of layout shape.
 */
export const DashboardDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  widgets: z.array(WidgetInstanceSchema).default([]),
});

export type DashboardDocument = z.infer<typeof DashboardDocumentSchema>;
