import { z } from "zod";

/**
 * Widget capability bindings — backward compatible with legacy single `capabilityId`.
 *
 * - `capabilityId` — primary binding (legacy single-cap widgets)
 * - `capabilityIds` — ordered list (multi-series without named slots)
 * - `slots` — named bindings for composite widgets (weather, air quality, HVAC, …)
 */
export const WidgetBindingsSchema = z.object({
  capabilityId: z.string().optional(),
  capabilityIds: z.array(z.string()).optional(),
  slots: z.record(z.string(), z.string()).optional(),
  sourceId: z.string().optional(),
  sourceType: z.string().optional(),
});

export type WidgetBindings = z.infer<typeof WidgetBindingsSchema>;

export function parseWidgetBindings(raw: unknown): WidgetBindings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const parsed = WidgetBindingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

/** Primary capability for legacy single-cap widgets and title resolution. */
export function primaryCapabilityId(bindings: unknown): string | undefined {
  const b = parseWidgetBindings(bindings);
  if (typeof b.capabilityId === "string" && b.capabilityId.trim()) {
    return b.capabilityId.trim();
  }
  if (Array.isArray(b.capabilityIds)) {
    const first = b.capabilityIds.find((id) => typeof id === "string" && id.trim());
    if (first) return first.trim();
  }
  if (b.slots) {
    for (const id of Object.values(b.slots)) {
      if (typeof id === "string" && id.trim()) return id.trim();
    }
  }
  return undefined;
}

/** All bound capability ids (deduped). */
export function allCapabilityIds(bindings: unknown): string[] {
  const b = parseWidgetBindings(bindings);
  const ids = new Set<string>();
  if (typeof b.capabilityId === "string" && b.capabilityId.trim()) {
    ids.add(b.capabilityId.trim());
  }
  if (Array.isArray(b.capabilityIds)) {
    for (const id of b.capabilityIds) {
      if (typeof id === "string" && id.trim()) ids.add(id.trim());
    }
  }
  if (b.slots) {
    for (const id of Object.values(b.slots)) {
      if (typeof id === "string" && id.trim()) ids.add(id.trim());
    }
  }
  return [...ids];
}

/** Named slot binding (composite widgets). */
export function getBindingSlot(bindings: unknown, slot: string): string | undefined {
  const b = parseWidgetBindings(bindings);
  const id = b.slots?.[slot];
  if (typeof id === "string" && id.trim()) return id.trim();
  if (slot === "primary") return primaryCapabilityId(b);
  return undefined;
}

/** Merge slot map into bindings; keeps legacy `capabilityId` when unset. */
export function mergeBindingSlots(
  bindings: unknown,
  slots: Record<string, string | undefined>
): WidgetBindings {
  const b = parseWidgetBindings(bindings);
  const nextSlots = { ...(b.slots ?? {}) };
  for (const [key, id] of Object.entries(slots)) {
    if (typeof id === "string" && id.trim()) nextSlots[key] = id.trim();
    else delete nextSlots[key];
  }
  const primary = primaryCapabilityId({ ...b, slots: nextSlots });
  return {
    ...b,
    slots: Object.keys(nextSlots).length > 0 ? nextSlots : undefined,
    capabilityId: b.capabilityId ?? primary,
  };
}

/** Persist slots and set `capabilityId` to first slot for legacy readers. */
export function bindingsFromSlots(slots: Record<string, string>): WidgetBindings {
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(slots)) {
    if (typeof v === "string" && v.trim()) cleaned[k] = v.trim();
  }
  const primary = Object.values(cleaned)[0];
  return {
    slots: cleaned,
    ...(primary ? { capabilityId: primary } : {}),
  };
}
