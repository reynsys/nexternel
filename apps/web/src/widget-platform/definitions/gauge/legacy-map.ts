import type { WidgetLibraryId } from "@/library/widget-catalog";
import type { WidgetConfig } from "@/types/dashboard";
import type { DashboardWidgetDto } from "@/types/dashboard";
import type { GaugePlatformInstance } from "@/widget-platform/types";
import { DEFAULT_GAUGE_PRESET_ID } from "./presets";
import { DASHBOARD_SPEED_PRESET } from "./gauge-gallery-catalog";

const LEGACY_GAUGE_PRESET: Partial<Record<WidgetLibraryId, string>> = {
  "gauge-semicircle": "server-temperature",
  "gauge-ring": "humidity-meter",
  "gauge-solid-arc": "grafana-smooth",
  "radial-stat": "radial-elastic",
};

export function isLegacyGaugeLibraryId(libraryId: string | undefined): boolean {
  return !!libraryId && libraryId.startsWith("gauge-");
}

export function legacyGaugeToPlatform(config: WidgetConfig): GaugePlatformInstance {
  const libraryId = config.libraryId;
  const presetId =
    (libraryId && LEGACY_GAUGE_PRESET[libraryId as WidgetLibraryId]) || DEFAULT_GAUGE_PRESET_ID;

  return {
    version: 1,
    definitionId: "gauge",
    presetId,
    binding: config.sensorId
      ? { kind: "sensor", sensorId: config.sensorId }
      : { kind: "none" },
    design: {},
    format: undefined,
  };
}

/** Map non-gauge-* library widgets and generic types into a gauge platform draft for Studio. */
export function legacyWidgetToGaugePlatform(
  widget: DashboardWidgetDto
): GaugePlatformInstance | null {
  if (widget.type === "library" && widget.config.libraryId === "radial-stat") {
    return legacyGaugeToPlatform({ ...widget.config, libraryId: "radial-stat" });
  }
  if (widget.type === "speed_test") {
    return {
      version: 1,
      definitionId: "gauge",
      presetId: DASHBOARD_SPEED_PRESET.id,
      binding: { kind: "none" },
      design: {},
      format: { unit: "Mbps", decimals: 1 },
    };
  }
  return null;
}