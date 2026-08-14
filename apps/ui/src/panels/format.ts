import type { ResolvedPanelCapability } from "../api";
import { parseCapabilityReading } from "./parse-capability-reading";

export function formatCapabilityValue(cap: ResolvedPanelCapability | undefined): string {
  const { value, unit } = parseCapabilityReading(cap);
  return unit ? `${value} ${unit}` : value;
}

export function groupCapabilitiesByArea(
  capabilities: ResolvedPanelCapability[]
): { areaKey: string; areaName: string; items: ResolvedPanelCapability[] }[] {
  const map = new Map<string, ResolvedPanelCapability[]>();
  for (const cap of capabilities) {
    const areaKey = cap.areaId ?? "__unassigned__";
    const list = map.get(areaKey) ?? [];
    list.push(cap);
    map.set(areaKey, list);
  }
  return [...map.entries()]
    .map(([areaKey, items]) => ({
      areaKey,
      areaName:
        areaKey === "__unassigned__"
          ? "Unassigned"
          : (items[0]?.areaName ?? "Area"),
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.areaName.localeCompare(b.areaName));
}

export function findCapabilityByKind(
  items: ResolvedPanelCapability[],
  kind: string
): ResolvedPanelCapability | undefined {
  return items.find((c) => c.kind === kind);
}
