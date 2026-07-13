/** Widget library templates for dashboard binding. */
import type { RelaysPanelLayout } from "@/types/dashboard";

export type WidgetBindingKind = "sensor" | "relay" | "sensor_history" | "device_relays";
export type WidgetLibraryCategory = "switches" | "gauges" | "statistics" | "data";

export const WIDGET_LIBRARY_CATALOG = [
  {
    id: "switch-device-list",
    category: "switches" as const,
    label: "Device relay panel (list)",
    description: "All relays from one ESP32 in a scrollable list (2, 4, 6, 8…).",
    source: "library/widgets/switches/DeviceRelaysWidget",
    bindings: ["device_relays"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "switch-device-grid",
    category: "switches" as const,
    label: "Device relay panel (grid)",
    description: "All relays — 2-column grid of pill toggles (2×2 for four switches).",
    source: "library/widgets/switches/DeviceRelaysWidget",
    bindings: ["device_relays"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "switch-device-vertical",
    category: "switches" as const,
    label: "Device panel (vertical buttons)",
    description: "All relays — compact stacked ON/OFF buttons per switch.",
    source: "library/widgets/switches/DeviceRelaysWidget",
    bindings: ["device_relays"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "switch-device-horizontal",
    category: "switches" as const,
    label: "Device panel (horizontal buttons)",
    description: "All relays — compact side-by-side ON | OFF per switch.",
    source: "library/widgets/switches/DeviceRelaysWidget",
    bindings: ["device_relays"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "switch-device-round",
    category: "switches" as const,
    label: "Device panel (round buttons)",
    description: "All relays — round power button per switch.",
    source: "library/widgets/switches/DeviceRelaysWidget",
    bindings: ["device_relays"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "switch-pill",
    category: "switches" as const,
    label: "Pill toggle",
    description: "Classic horizontal ON/OFF slider — compact 1×1 cell.",
    source: "library/widgets/switches/SwitchPill",
    bindings: ["relay"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "switch-compact",
    category: "switches" as const,
    label: "Compact switch",
    description: "Icon, name, and mini toggle in one row — ideal for many relays.",
    source: "library/widgets/switches/SwitchCompact",
    bindings: ["relay"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "switch-round",
    category: "switches" as const,
    label: "Round power button",
    description: "Large circular button with glow when active.",
    source: "library/widgets/switches/SwitchRound",
    bindings: ["relay"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "switch-stat-card",
    category: "switches" as const,
    label: "Relay status card",
    description: "Status display (ON/OFF) with badge — use the toggle to control the relay.",
    source: "library/widgets/switches/SwitchStatCard",
    bindings: ["relay"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "switch-vertical",
    category: "switches" as const,
    label: "Vertical buttons",
    description: "Stacked ON and OFF buttons — best in a tall widget.",
    source: "library/widgets/switches/SwitchVertical",
    bindings: ["relay"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "switch-horizontal",
    category: "switches" as const,
    label: "Horizontal buttons",
    description: "Side-by-side ON | OFF — scales to cell width.",
    source: "library/widgets/switches/SwitchHorizontal",
    bindings: ["relay"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "gauge-semicircle",
    category: "gauges" as const,
    label: "Semicircle needle gauge",
    description: "Speedometer-style dial with coloured zones and needle — ideal for temperature.",
    source: "library/widgets/gauges/SemicircleNeedleGauge",
    bindings: ["sensor"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "gauge-ring",
    category: "gauges" as const,
    label: "Ring gauge",
    description: "Circular progress ring with centre value — ideal for humidity (0–100%).",
    source: "library/widgets/gauges/RingGauge",
    bindings: ["sensor"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "gauge-solid-arc",
    category: "gauges" as const,
    label: "Solid arc gauge",
    description: "Thick semicircle arc that fills with value — fuel-gauge style.",
    source: "library/widgets/gauges/RingGauge",
    bindings: ["sensor"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "gaussian-stat",
    category: "statistics" as const,
    label: "Gaussian stat card",
    description: "Large value with icon, room subtitle, and live status.",
    source: "library/widgets/statistics/GaussianStatCard",
    bindings: ["sensor"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "icon-stat",
    category: "statistics" as const,
    label: "Icon color widget",
    description: "Compact stat with coloured icon badge.",
    source: "library/widgets/statistics/IconColorWidget",
    bindings: ["sensor"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "progress-stat",
    category: "statistics" as const,
    label: "Progress stat card",
    description: "Value with progress bar — ideal for humidity (0–100%).",
    source: "library/widgets/data/ProgressStatCard",
    bindings: ["sensor"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "radial-stat",
    category: "statistics" as const,
    label: "Radial stat card",
    description: "Circular gauge for a single numeric reading.",
    source: "library/widgets/data/RadialStatCard",
    bindings: ["sensor"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "area-stats",
    category: "data" as const,
    label: "Area history chart",
    description: "24-hour area chart with latest value headline.",
    source: "library/widgets/data/AreaStatsCard",
    bindings: ["sensor_history"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "line-history",
    category: "data" as const,
    label: "Line history chart",
    description: "Sparkline of sensor readings over the last 24 hours.",
    source: "library/widgets/data/WebsiteVisitorsCard",
    bindings: ["sensor_history"] as WidgetBindingKind[],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
] as const;

export type WidgetLibraryId = (typeof WIDGET_LIBRARY_CATALOG)[number]["id"];

export function getCatalogEntry(id: WidgetLibraryId | string | undefined) {
  return WIDGET_LIBRARY_CATALOG.find((e) => e.id === id);
}

export function catalogByCategory(category: WidgetLibraryCategory) {
  return WIDGET_LIBRARY_CATALOG.filter((e) => e.category === category);
}

export function relaysLayoutForLibraryId(id: WidgetLibraryId | string): RelaysPanelLayout {
  switch (id) {
    case "switch-device-grid":
      return "grid-2";
    case "switch-device-vertical":
      return "vertical";
    case "switch-device-horizontal":
      return "horizontal";
    case "switch-device-round":
      return "round";
    default:
      return "list";
  }
}

export function catalogForBinding(
  binding: "sensor" | "relay" | "all",
  opts: { hasSensors: boolean; hasRelays: boolean }
) {
  return WIDGET_LIBRARY_CATALOG.filter((e) => {
    const supportsRelay =
      e.bindings.includes("relay") || e.bindings.includes("device_relays");
    const supportsSensor =
      e.bindings.includes("sensor") || e.bindings.includes("sensor_history");

    if (binding === "relay") {
      if (!opts.hasRelays) return false;
      return (
        e.category === "switches" &&
        (e.bindings.includes("relay") || e.bindings.includes("device_relays"))
      );
    }
    if (binding === "sensor") {
      if (!opts.hasSensors) return false;
      return supportsSensor;
    }

    if (supportsRelay && !opts.hasRelays && !supportsSensor) return false;
    if (supportsSensor && !opts.hasSensors && !supportsRelay) return false;
    if (supportsRelay && !opts.hasRelays && supportsSensor && !opts.hasSensors) return false;
    if (supportsSensor && !opts.hasSensors && supportsRelay && !opts.hasRelays) return false;
    if (supportsRelay && !opts.hasRelays) return supportsSensor && opts.hasSensors;
    if (supportsSensor && !opts.hasSensors) return supportsRelay && opts.hasRelays;
    return true;
  });
}

export function defaultLibraryId(opts: { hasSensors: boolean; hasRelays: boolean }): WidgetLibraryId {
  if (opts.hasRelays) return "switch-device-list";
  return "gaussian-stat";
}

export function primaryBinding(
  bindings: readonly WidgetBindingKind[]
): WidgetBindingKind {
  return bindings[0];
}

export function bindingKindForLibrary(
  libraryId: WidgetLibraryId,
  config: { sensorId?: string; relayId?: string; deviceId?: string }
): WidgetBindingKind | null {
  const entry = getCatalogEntry(libraryId);
  if (!entry) return null;
  if (config.deviceId && entry.bindings.includes("device_relays")) return "device_relays";
  if (config.relayId && entry.bindings.includes("relay")) return "relay";
  if (config.sensorId) {
    if (entry.bindings.includes("sensor_history")) return "sensor_history";
    if (entry.bindings.includes("sensor")) return "sensor";
  }
  return primaryBinding(entry.bindings);
}
