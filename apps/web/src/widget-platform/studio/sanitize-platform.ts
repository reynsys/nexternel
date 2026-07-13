import type { GaugePlatformInstance, WidgetBinding } from "@/widget-platform/types";
import {
  DEFAULT_GAUGE_PRESET_ID,
  getGaugePreset,
  resolveGaugePresetId,
} from "@/widget-platform/definitions/gauge/presets";
import { sanitizeArcForRange } from "@/widget-platform/definitions/gauge/gauge-arc-sanitize";
function normalizeBinding(binding: WidgetBinding | undefined): WidgetBinding {
  if (binding?.kind === "sensor" && binding.sensorId) {
    return { kind: "sensor", sensorId: binding.sensorId };
  }
  return { kind: "none" };
}

/** Ensure platform has required fields before Studio / dashboard render. */
export function ensureGaugePlatform(
  instance: Partial<GaugePlatformInstance> & { definitionId: "gauge" }
): GaugePlatformInstance {
  const presetId = resolveGaugePresetId(instance.presetId) ?? DEFAULT_GAUGE_PRESET_ID;
  return {
    version: 1,
    definitionId: "gauge",
    presetId,
    binding: normalizeBinding(instance.binding),
    design: instance.design ?? {},
    format: instance.format,
  };
}

/** Clamp studio edits to schema limits so PATCH validation succeeds and dashboard can load config. */
export function sanitizeGaugePlatform(instance: GaugePlatformInstance): GaugePlatformInstance {
  const base = ensureGaugePlatform(instance);
  const preset = getGaugePreset(base.presetId);
  const design = base.design;
  if (!design) return base;

  const minValue = design.minValue ?? preset?.defaultMin ?? 0;
  const maxValue = design.maxValue ?? preset?.defaultMax ?? 100;
  const arc = design.arc
    ? sanitizeArcForRange(
        {
          ...design.arc,
          width:
            design.arc.width !== undefined
              ? Math.min(0.95, Math.max(0.05, design.arc.width))
              : undefined,
          padding:
            design.arc.padding !== undefined
              ? Math.min(0.25, Math.max(0, design.arc.padding))
              : undefined,
        },
        minValue,
        maxValue
      )
    : undefined;

  const pointer = design.pointer
    ? {
        ...design.pointer,
        length:
          design.pointer.length !== undefined
            ? Math.min(1.5, Math.max(0.1, design.pointer.length))
            : undefined,
        width:
          design.pointer.width !== undefined
            ? Math.min(80, Math.max(1, design.pointer.width))
            : undefined,
      }
    : undefined;

  const pointers = design.pointers?.map((p) => ({
    ...p,
    length: p.length !== undefined ? Math.min(1.5, Math.max(0.1, p.length)) : undefined,
    width: p.width !== undefined ? Math.min(80, Math.max(1, p.width)) : undefined,
  }));

  return {
    ...base,
    design: {
      ...design,
      arc,
      pointer,
      pointers,
    },
  };
}