import type { CapabilityKind } from "./capability.js";
import type { PanelKind } from "./panel-scope.js";
import { normalizePanelKind } from "./panel-scope.js";

/** How a core panel resolves data and which dashboard editor fields apply. */
export type PanelScopeMode = "capabilities" | "area" | "integration";

export type PanelLayoutSize = {
  w: number;
  h: number;
  minW: number;
  minH: number;
};

export type PanelDefinition = {
  kind: PanelKind;
  label: string;
  description: string;
  scopeMode: PanelScopeMode;
  supportedKinds: readonly CapabilityKind[];
  excludeKinds?: readonly CapabilityKind[];
  /** Shown in Dashboard → Add Panel for normal operators. */
  userSelectable: boolean;
  /** Developer preview page only (all registered kinds render). */
  previewOnly?: boolean;
  sortOrder: number;
  defaultSize: PanelLayoutSize;
};

/** Core panels — canonical registry; UI loads via API. */
export const CORE_PANEL_REGISTRY: readonly PanelDefinition[] = [
  {
    kind: "panel.controls",
    label: "Controls",
    description: "Turn things on and off.",
    scopeMode: "capabilities",
    supportedKinds: ["switch", "brightness", "colour"],
    userSelectable: true,
    sortOrder: 10,
    defaultSize: { w: 3, h: 2, minW: 2, minH: 2 },
  },
  {
    kind: "panel.status",
    label: "Status",
    description: "Show live values and states.",
    scopeMode: "capabilities",
    supportedKinds: [
      "temperature",
      "humidity",
      "pressure",
      "battery",
      "voltage",
      "current",
      "power",
      "energy",
      "co2",
      "pm1",
      "pm25",
      "pm10",
      "number",
      "text",
      "enum",
      "binary_sensor",
      "motion",
      "door",
      "lock",
      "alarm",
    ],
    excludeKinds: ["switch", "brightness", "colour"],
    userSelectable: true,
    sortOrder: 20,
    defaultSize: { w: 6, h: 3, minW: 4, minH: 2 },
  },
  {
    kind: "panel.charts",
    label: "Charts",
    description: "See how values change over time.",
    scopeMode: "capabilities",
    supportedKinds: [
      "temperature",
      "humidity",
      "pressure",
      "battery",
      "voltage",
      "current",
      "power",
      "energy",
      "co2",
      "pm1",
      "pm25",
      "pm10",
      "number",
    ],
    excludeKinds: ["switch", "brightness", "colour"],
    userSelectable: true,
    sortOrder: 30,
    defaultSize: { w: 8, h: 5, minW: 6, minH: 4 },
  },
  {
    kind: "panel.camera",
    label: "Cameras",
    description: "Watch live camera streams for a place.",
    scopeMode: "area",
    supportedKinds: ["camera"],
    userSelectable: true,
    sortOrder: 40,
    defaultSize: { w: 6, h: 5, minW: 4, minH: 4 },
  },
  {
    kind: "panel.weather",
    label: "Weather",
    description: "Show the weather forecast.",
    scopeMode: "integration",
    supportedKinds: ["weather"],
    userSelectable: true,
    sortOrder: 50,
    defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
  },
  {
    kind: "panel.calendar",
    label: "Calendar",
    description: "Show the current month.",
    scopeMode: "integration",
    supportedKinds: [],
    userSelectable: true,
    sortOrder: 55,
    defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
  },
  {
    kind: "panel.devices",
    label: "Devices",
    description: "See which devices are online or offline.",
    scopeMode: "integration",
    supportedKinds: [],
    userSelectable: true,
    sortOrder: 58,
    defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
  },
  {
    kind: "panel.system",
    label: "System",
    description: "Show server health and version.",
    scopeMode: "integration",
    supportedKinds: [],
    userSelectable: true,
    sortOrder: 60,
    defaultSize: { w: 4, h: 3, minW: 3, minH: 2 },
  },
];

export function getPanelDefinition(kind: PanelKind): PanelDefinition | undefined {
  return CORE_PANEL_REGISTRY.find((p) => p.kind === kind);
}

export function isCorePanelKind(kind: string): kind is PanelKind {
  return CORE_PANEL_REGISTRY.some((p) => p.kind === kind);
}

export function listUserSelectablePanels(): readonly PanelDefinition[] {
  return CORE_PANEL_REGISTRY.filter((p) => p.userSelectable).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

export function listPreviewPanels(): readonly PanelDefinition[] {
  return [...CORE_PANEL_REGISTRY].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getPanelScopeMode(kind: string): PanelScopeMode {
  const def = getPanelDefinition(normalizePanelKind(kind) as PanelKind);
  return def?.scopeMode ?? "capabilities";
}

export function panelUsesCapabilityScope(kind: string): boolean {
  return getPanelScopeMode(kind) === "capabilities";
}

export function panelUsesAreaScope(kind: string): boolean {
  const mode = getPanelScopeMode(kind);
  return mode === "capabilities" || mode === "area";
}

export function panelIsIntegrationKind(kind: string): boolean {
  return getPanelScopeMode(kind) === "integration";
}
