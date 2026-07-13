import type { GaugeDesignConfig, GaugePlatformInstance } from "@/widget-platform/types";
import { GAUGE_GALLERY_CATALOG, DASHBOARD_SPEED_PRESET } from "./gauge-gallery-catalog";

export type GaugePresetMeta = {
  id: string;
  label: string;
  description: string;
  design: GaugeDesignConfig;
  format?: GaugePlatformInstance["format"];
  defaultMin: number;
  defaultMax: number;
};

/** Serializable presets — all 16 react-gauge-component gallery entries. */
export const GAUGE_PRESET_CATALOG: GaugePresetMeta[] = [
  ...GAUGE_GALLERY_CATALOG.map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    design: p.design,
    format: p.format,
    defaultMin: p.defaultMin,
    defaultMax: p.defaultMax,
  })),
  {
    id: DASHBOARD_SPEED_PRESET.id,
    label: DASHBOARD_SPEED_PRESET.label,
    description: DASHBOARD_SPEED_PRESET.description,
    design: DASHBOARD_SPEED_PRESET.design,
    format: DASHBOARD_SPEED_PRESET.format,
    defaultMin: DASHBOARD_SPEED_PRESET.defaultMin,
    defaultMax: DASHBOARD_SPEED_PRESET.defaultMax,
  },
];

export function resolveGaugePresetId(id: string | undefined): string | undefined {
  if (!id) return undefined;
  return LEGACY_GAUGE_PRESET_ALIASES[id] ?? id;
}

export function getGaugePreset(id: string | undefined): GaugePresetMeta | undefined {
  if (!id) return undefined;
  const resolved = resolveGaugePresetId(id);
  return GAUGE_PRESET_CATALOG.find((p) => p.id === resolved);
}

export const DEFAULT_GAUGE_PRESET_ID = "server-temperature";

/** Legacy preset ids kept for saved widgets. */
export const LEGACY_GAUGE_PRESET_ALIASES: Record<string, string> = {
  "humidity-ring": "humidity-meter",
  "grafana-classic": "grafana-smooth",
};
