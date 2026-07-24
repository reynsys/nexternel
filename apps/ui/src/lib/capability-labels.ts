import type { Capability } from "../api";

/** Short label for dropdowns: Area · Device · Entity */
export function capabilityPickerLabel(cap: Capability): string {
  const area = cap.roomName?.trim() || "No area";
  return `${area} · ${cap.deviceName} · ${cap.name}`;
}

/** Secondary line under a widget: Device · Area */
export function capabilityLocationLabel(cap: Capability | undefined): string {
  if (!cap) return "No capability bound";
  const area = cap.roomName?.trim();
  return area ? `${cap.deviceName} · ${area}` : cap.deviceName;
}

/** Default widget title from the bound entity (not the catalog type name). */
export function defaultWidgetTitle(
  cap: Capability | undefined,
  fallbackTypeLabel: string
): string {
  if (cap?.name?.trim()) return cap.name.trim();
  return fallbackTypeLabel;
}
