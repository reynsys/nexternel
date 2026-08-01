import type { Capability, HistoryRange, WidgetInstance } from "../../api";
import type { EchartsWidgetConfig } from "./types";

const LEGACY_STYLE_TO_PRESET: Record<string, string> = {
  thermometer: "gauge-temperature",
  ring: "gauge-ring",
  dial: "gauge",
  progress: "gauge-progress",
};

export function isEchartsWidgetType(type: string): boolean {
  return type === "echarts" || type === "gauge" || type === "history";
}

export function catalogTypeForPreset(presetId: string): string {
  return `echarts.${presetId}`;
}

export function presetIdFromCatalogType(catalogType: string): string | null {
  if (catalogType.startsWith("echarts.")) return catalogType.slice("echarts.".length);
  return null;
}

export function parseEchartsConfig(config: Record<string, unknown>): EchartsWidgetConfig {
  const presetId =
    typeof config.presetId === "string" && config.presetId
      ? config.presetId
      : typeof config.gaugeStyle === "string" && LEGACY_STYLE_TO_PRESET[config.gaugeStyle]
        ? LEGACY_STYLE_TO_PRESET[config.gaugeStyle]
        : "gauge";
  const range =
    config.range === "1h" ||
    config.range === "6h" ||
    config.range === "24h" ||
    config.range === "7d"
      ? (config.range as HistoryRange)
      : undefined;
  const min = coerceOptionalNumber(config.min);
  const max = coerceOptionalNumber(config.max);
  const accent = typeof config.accent === "string" ? config.accent : undefined;
  const optionOverride =
    config.optionOverride &&
    typeof config.optionOverride === "object" &&
    !Array.isArray(config.optionOverride)
      ? (config.optionOverride as Record<string, unknown>)
      : undefined;
  return { presetId, range, min, max, accent, optionOverride };
}

function coerceOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Map legacy gauge/history widgets onto echarts + presetId. */
export function migrateWidgetToEcharts(widget: WidgetInstance): WidgetInstance {
  if (widget.type === "echarts") {
    const cfg = parseEchartsConfig(widget.config);
    if (!widget.config.presetId) {
      return {
        ...widget,
        config: { ...widget.config, presetId: cfg.presetId },
      };
    }
    return widget;
  }

  if (widget.type === "gauge") {
    const style =
      typeof widget.config.gaugeStyle === "string" ? widget.config.gaugeStyle : "dial";
    const presetId = LEGACY_STYLE_TO_PRESET[style] ?? "gauge";
    const { gaugeStyle: _drop, ...rest } = widget.config;
    return {
      ...widget,
      type: "echarts",
      config: { ...rest, presetId },
    };
  }

  if (widget.type === "history") {
    return {
      ...widget,
      type: "echarts",
      config: {
        ...widget.config,
        presetId: "line-basic",
        range:
          widget.config.range === "1h" ||
          widget.config.range === "6h" ||
          widget.config.range === "24h" ||
          widget.config.range === "7d"
            ? widget.config.range
            : "24h",
      },
    };
  }

  return widget;
}

export function defaultRangeForKind(kind: string | undefined): { min: number; max: number } {
  if (kind === "temperature") return { min: 0, max: 60 };
  if (kind === "humidity" || kind === "battery") return { min: 0, max: 100 };
  if (kind === "pressure") return { min: 950, max: 1050 };
  if (kind === "power") return { min: 0, max: 5000 };
  if (kind === "energy") return { min: 0, max: 50 };
  return { min: 0, max: 100 };
}

export function resolveMinMax(
  config: EchartsWidgetConfig,
  cap: Capability | undefined
): { min: number; max: number } {
  const fallback = defaultRangeForKind(cap?.kind);
  const value = typeof cap?.state?.value === "number" ? cap.state.value : 0;
  let { min, max } = fallback;
  if (config.min !== undefined) min = config.min;
  if (config.max !== undefined) max = config.max;
  if (config.min === undefined && config.max === undefined && value > max) {
    max = Math.ceil(value / 10) * 10;
  }
  if (min >= max) max = min + 1;
  return { min, max };
}

export function liveValue(cap: Capability | undefined): number | null {
  if (!cap?.state) return null;
  const v = cap.state.value;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function defaultPresetForKind(kind: string | undefined): string {
  if (kind === "temperature") return "gauge-temperature";
  if (kind === "humidity") return "gauge-ring";
  if (kind === "pressure") return "gauge-barometer";
  if (kind === "battery") return "gauge-progress";
  return "gauge";
}
