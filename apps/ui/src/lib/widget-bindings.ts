/** UI copy of domain widget-bindings (keeps Vite build simple without domain dist). */

export type WidgetBindings = {
  capabilityId?: string;
  capabilityIds?: string[];
  deviceIds?: string[];
  slots?: Record<string, string>;
  sourceId?: string;
  sourceType?: string;
};

export function parseWidgetBindings(raw: unknown): WidgetBindings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const b = raw as WidgetBindings;
  return {
    capabilityId: typeof b.capabilityId === "string" ? b.capabilityId : undefined,
    capabilityIds: Array.isArray(b.capabilityIds) ? b.capabilityIds : undefined,
    deviceId: typeof b.deviceId === "string" ? b.deviceId : undefined,
    deviceIds: Array.isArray(b.deviceIds) ? b.deviceIds : undefined,
    slots:
      b.slots && typeof b.slots === "object" && !Array.isArray(b.slots) ? b.slots : undefined,
    sourceId: typeof b.sourceId === "string" ? b.sourceId : undefined,
    sourceType: typeof b.sourceType === "string" ? b.sourceType : undefined,
  };
}

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

export function getBindingSlot(bindings: unknown, slot: string): string | undefined {
  const b = parseWidgetBindings(bindings);
  const id = b.slots?.[slot];
  if (typeof id === "string" && id.trim()) return id.trim();
  if (slot === "primary") return primaryCapabilityId(b);
  return undefined;
}

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
