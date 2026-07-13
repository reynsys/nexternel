import type { GaugeDesignConfig, GaugePlatformInstance, GaugeTypeId } from "@/widget-platform/types";
import { mergeGaugeDesign } from "@/widget-platform/definitions/gauge/build-props";
import {
  sanitizeArcForRange,
  scaleSubArcLimits,
  scaleTickValues,
} from "@/widget-platform/definitions/gauge/gauge-arc-sanitize";
import { GAUGE_PRESET_CATALOG, getGaugePreset } from "@/widget-platform/definitions/gauge/presets";

/** Editable gauge config in Widget Studio (react-gauge-component shape). */
export type GaugeSandboxConfig = {
  type: GaugeTypeId;
  minValue: number;
  maxValue: number;
  startAngle?: number;
  endAngle?: number;
  marginInPercent?: number;
  arc?: GaugeDesignConfig["arc"];
  pointer?: GaugeDesignConfig["pointer"];
  pointers?: NonNullable<GaugeDesignConfig["pointers"]>;
  labels?: GaugeDesignConfig["labels"];
};

export function defaultSandboxMidpoint(config: GaugeSandboxConfig): number {
  return (config.minValue + config.maxValue) / 2;
}

export function platformToSandboxConfig(instance: GaugePlatformInstance): GaugeSandboxConfig {
  const preset = getGaugePreset(instance.presetId);
  const design = mergeGaugeDesign(instance);
  const gaugeType = design.gaugeType ?? "semicircle";
  const minValue = design.minValue ?? preset?.defaultMin ?? 0;
  const maxValue = design.maxValue ?? preset?.defaultMax ?? 100;
  const arc = design.arc
    ? sanitizeArcForRange({ ...design.arc }, minValue, maxValue)
    : undefined;

  return {
    type: gaugeType,
    minValue,
    maxValue,
    startAngle: design.startAngle,
    endAngle: design.endAngle,
    marginInPercent: design.marginInPercent,
    arc,
    pointer: design.pointer ? { ...design.pointer } : undefined,
    pointers: design.pointers ? design.pointers.map((p) => ({ ...p })) : undefined,
    labels: design.labels
      ? {
          valueLabel: design.labels.valueLabel ? { ...design.labels.valueLabel } : undefined,
          tickLabels: design.labels.tickLabels ? { ...design.labels.tickLabels } : undefined,
        }
      : undefined,
  };
}

/** When min/max changes, scale zone limits and ticks to stay valid. */
export function patchSandboxValueRange(
  sandbox: GaugeSandboxConfig,
  patch: { minValue?: number; maxValue?: number }
): GaugeSandboxConfig {
  const prevMin = sandbox.minValue;
  const prevMax = sandbox.maxValue;
  const minValue = patch.minValue ?? prevMin;
  const maxValue = patch.maxValue ?? prevMax;
  if (minValue === prevMin && maxValue === prevMax) return sandbox;

  const arc = scaleSubArcLimits(sandbox.arc, prevMin, prevMax, minValue, maxValue);
  const tickValues = sandbox.labels?.tickLabels?.tickValues;
  const nextTicks =
    tickValues?.length && (minValue !== prevMin || maxValue !== prevMax)
      ? scaleTickValues(tickValues, prevMin, prevMax, minValue, maxValue)
      : tickValues;

  return {
    ...sandbox,
    minValue,
    maxValue,
    arc,
    labels: sandbox.labels
      ? {
          ...sandbox.labels,
          tickLabels: sandbox.labels.tickLabels
            ? { ...sandbox.labels.tickLabels, tickValues: nextTicks }
            : undefined,
        }
      : undefined,
  };
}

export function sandboxConfigToPlatform(
  sandbox: GaugeSandboxConfig,
  existing: GaugePlatformInstance
): GaugePlatformInstance {
  const design: GaugeDesignConfig = {
    gaugeType: sandbox.type,
    minValue: sandbox.minValue,
    maxValue: sandbox.maxValue,
    startAngle: sandbox.startAngle,
    endAngle: sandbox.endAngle,
    marginInPercent: sandbox.marginInPercent,
    arc: sandbox.arc,
    pointer: sandbox.pointers?.length ? undefined : sandbox.pointer,
    pointers: sandbox.pointers?.length ? sandbox.pointers : undefined,
    labels: sandbox.labels,
  };

  return {
    ...existing,
    design,
  };
}

/** Apply a catalog preset — fresh design + format (no merge with previous preset). */
export function platformFromPreset(
  presetId: string,
  existing: GaugePlatformInstance
): GaugePlatformInstance {
  const preset = getGaugePreset(presetId);
  if (!preset) return existing;
  const isSensor = existing.binding?.kind === "sensor";
  return {
    ...existing,
    presetId: preset.id,
    design: {},
    format: isSensor
      ? preset.format?.decimals !== undefined
        ? { decimals: preset.format.decimals }
        : undefined
      : preset.format
        ? { ...preset.format }
        : undefined,
  };
}

function arcForTypeChange(arc: GaugeDesignConfig["arc"] | undefined) {
  if (!arc) return undefined;
  const next = { ...arc };
  if (next.nbSubArcs !== undefined) delete next.subArcs;
  else if (next.subArcs?.length) {
    delete next.nbSubArcs;
    delete next.gradient;
  }
  return next;
}

/** Switch gauge family — apply type-appropriate arc/pointer/ticks (not semicircle arc on grafana). */
export function applyGaugeTypeChange(
  sandbox: GaugeSandboxConfig,
  newType: GaugeTypeId
): GaugeSandboxConfig {
  if (sandbox.type === newType) return sandbox;

  const template =
    GAUGE_PRESET_CATALOG.find((p) => p.design.gaugeType === newType) ??
    GAUGE_PRESET_CATALOG[0];
  const td = template.design;
  const templateTicks = td.labels?.tickLabels?.tickValues ?? [
    sandbox.minValue,
    sandbox.maxValue,
  ];

  return {
    type: newType,
    minValue: sandbox.minValue,
    maxValue: sandbox.maxValue,
    startAngle: td.startAngle,
    endAngle: td.endAngle,
    marginInPercent: sandbox.marginInPercent,
    arc: arcForTypeChange(td.arc),
    pointer: td.pointer ? { ...td.pointer } : undefined,
    pointers: undefined,
    labels: {
      valueLabel: td.labels?.valueLabel ? { ...td.labels.valueLabel } : sandbox.labels?.valueLabel,
      tickLabels: {
        type: td.labels?.tickLabels?.type ?? "outer",
        hideMinMax: td.labels?.tickLabels?.hideMinMax,
        tickValues: scaleTickValues(
          templateTicks,
          template.defaultMin,
          template.defaultMax,
          sandbox.minValue,
          sandbox.maxValue
        ),
        tickFontSize: sandbox.labels?.tickLabels?.tickFontSize,
      },
    },
  };
}

/**
 * Type selector — identical path to Random / Gallery: load catalog preset with design {}.
 * (Explicit applyGaugeTypeChange design snapshots were crashing react-gauge-component.)
 */
export function platformFromGaugeTypeChange(
  sandbox: GaugeSandboxConfig,
  existing: GaugePlatformInstance,
  newType: GaugeTypeId
): GaugePlatformInstance {
  if (sandbox.type === newType) return existing;

  const template =
    GAUGE_PRESET_CATALOG.find((p) => p.design.gaugeType === newType) ??
    GAUGE_PRESET_CATALOG[0];

  return platformFromPreset(template.id, existing);
}
