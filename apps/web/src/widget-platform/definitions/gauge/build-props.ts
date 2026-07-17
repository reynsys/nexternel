import type { GaugeComponentProps } from "react-gauge-component";
import type { CSSProperties } from "react";
import type { GaugeDesignConfig, GaugePlatformInstance, ValueFormatConfig } from "@/widget-platform/types";
import { getGaugePreset } from "./presets";
import {
  type GaugeLayoutContext,
  resolveGaugeMargins,
  resolveValueLabelOffsetY,
  shouldHideGaugeValueLabel,
} from "@/widget-platform/gauge-cell-layout";
import { sanitizeArcForRange } from "./gauge-arc-sanitize";

function deepMergeDesign(base: GaugeDesignConfig, override: GaugeDesignConfig): GaugeDesignConfig {
  return {
    ...base,
    ...override,
    arc: { ...base.arc, ...override.arc },
    pointer: override.pointers?.length ? undefined : { ...base.pointer, ...override.pointer },
    pointers: override.pointers ?? base.pointers,
    labels: {
      ...base.labels,
      ...override.labels,
      valueLabel: { ...base.labels?.valueLabel, ...override.labels?.valueLabel },
      tickLabels: { ...base.labels?.tickLabels, ...override.labels?.tickLabels },
    },
  };
}

export function mergeGaugeDesign(instance: GaugePlatformInstance): GaugeDesignConfig {
  const preset = getGaugePreset(instance.presetId);
  const saved = instance.design ?? {};

  /** Saved Gauge Studio snapshot — preset must not re-blend (e.g. network-speed arc on radial/grafana). */
  const hasStudioSnapshot =
    saved.gaugeType !== undefined &&
    (saved.arc !== undefined ||
      saved.pointer !== undefined ||
      saved.pointers !== undefined ||
      saved.labels !== undefined);

  if (hasStudioSnapshot) {
    const minValue = saved.minValue ?? preset?.defaultMin ?? 0;
    const maxValue = saved.maxValue ?? preset?.defaultMax ?? 100;
    return {
      ...saved,
      gaugeType: saved.gaugeType,
      minValue,
      maxValue,
      arc: sanitizeArcForRange(saved.arc, minValue, maxValue),
    };
  }

  return deepMergeDesign(preset?.design ?? {}, saved);
}

export function formatGaugeDisplayValue(
  value: number,
  format: ValueFormatConfig | undefined,
  unitFromSensor?: string | null
): string {
  const scaled = format?.scale ? value * format.scale : value;
  const decimals = format?.decimals ?? (Number.isInteger(scaled) ? 0 : 1);
  const rounded =
    decimals === 0 ? String(Math.round(scaled)) : scaled.toFixed(decimals);
  const unit = unitFromSensor ?? format?.unit ?? "";
  if (!unit) return rounded;
  if (unit.startsWith("%") || unit.startsWith("°")) return `${rounded}${unit}`;
  return `${rounded} ${unit}`;
}

/** Omit undefined entries; cast for npm types lagging behind runtime API. */
function pickDefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

function buildArcConfig(
  arc: NonNullable<GaugeDesignConfig["arc"]>,
  minValue: number,
  maxValue: number
): NonNullable<GaugeComponentProps["arc"]> {
  const safe = sanitizeArcForRange(arc, minValue, maxValue) ?? arc;
  return pickDefined({
    width: safe.width,
    padding: safe.padding,
    cornerRadius: safe.cornerRadius,
    padEndpoints: safe.padEndpoints,
    nbSubArcs: safe.subArcs?.length ? undefined : safe.nbSubArcs,
    gradient: safe.gradient,
    colorArray: safe.colorArray,
    subArcs: safe.subArcs,
    emptyColor: safe.emptyColor,
    subArcsStrokeWidth: safe.subArcsStrokeWidth,
    subArcsStrokeColor: safe.subArcsStrokeColor,
    outerArc: safe.outerArc,
    effects: safe.effects,
  }) as NonNullable<GaugeComponentProps["arc"]>;
}

function buildPointerConfig(
  pointer: NonNullable<GaugeDesignConfig["pointer"]>
): NonNullable<GaugeComponentProps["pointer"]> {
  return pickDefined({
    type: pointer.type,
    color: pointer.color,
    baseColor: pointer.baseColor,
    length: pointer.length,
    width: pointer.width,
    strokeWidth: pointer.strokeWidth,
    strokeColor: pointer.strokeColor,
    elastic: pointer.elastic,
    animationDuration: pointer.animationDuration,
    animationDelay: pointer.animationDelay,
    hide: pointer.hide,
  }) as NonNullable<GaugeComponentProps["pointer"]>;
}

export function buildGaugeComponentProps(
  instance: GaugePlatformInstance,
  value: number | null,
  unitFromSensor?: string | null,
  options?: { layoutContext?: GaugeLayoutContext }
): GaugeComponentProps {
  const layoutContext = options?.layoutContext ?? "standard";
  const preset = getGaugePreset(instance.presetId);
  const design = mergeGaugeDesign(instance);
  const format = { ...preset?.format, ...instance.format };

  const minValue = design.minValue ?? preset?.defaultMin ?? 0;
  const maxValue = design.maxValue ?? preset?.defaultMax ?? 100;
  const numericValue = value === null ? minValue : value;

  const tickValues = design.labels?.tickLabels?.tickValues;
  const valueLabelStyle: CSSProperties = {
    fontSize: design.labels?.valueLabel?.fontSize ?? "clamp(0.8rem, 7cqmin, 1.5rem)",
    fill: "var(--foreground)",
    fontWeight: 600,
  };

  const gaugeType = design.gaugeType ?? "semicircle";

  const valueLabel = design.labels?.valueLabel?.hide || shouldHideGaugeValueLabel(layoutContext)
    ? { hide: true }
    : pickDefined({
        formatTextValue: (v: number) => formatGaugeDisplayValue(v, format, unitFromSensor),
        matchColorWithArc: design.labels?.valueLabel?.matchColorWithArc,
        animateValue: design.labels?.valueLabel?.animateValue,
        offsetX: design.labels?.valueLabel?.offsetX,
        offsetY: resolveValueLabelOffsetY(design, gaugeType),
        style: valueLabelStyle,
      });

  const tickLabels = tickValues?.length
    ? {
        type: design.labels?.tickLabels?.type ?? "outer",
        hideMinMax: design.labels?.tickLabels?.hideMinMax,
        ticks: tickValues.map((v) => ({ value: v })),
        defaultTickValueConfig: {
          formatTextValue: (v: number) => String(Math.round(v)),
          style: {
            fontSize: design.labels?.tickLabels?.tickFontSize ?? "clamp(7px, 3.5cqmin, 11px)",
            fill: "var(--muted-foreground)",
          },
        },
        defaultTickLineConfig: {
          color: "var(--muted-foreground)",
          length: 4,
          width: 1,
        },
      }
    : {
        type: design.labels?.tickLabels?.type ?? "outer",
        hideMinMax: design.labels?.tickLabels?.hideMinMax,
      };

  // Published @types lag behind runtime (Template source); single cast avoids per-field errors.
  const pointerProps = design.pointers?.length
    ? { pointer: undefined, pointers: design.pointers }
    : { pointer: design.pointer ? buildPointerConfig(design.pointer) : undefined };

  return pickDefined({
    value: numericValue,
    minValue,
    maxValue,
    type: gaugeType,
    marginInPercent: resolveGaugeMargins(design, gaugeType, layoutContext),
    startAngle: design.startAngle,
    endAngle: design.endAngle,
    style: { width: "100%", height: "100%" },
    arc: design.arc ? buildArcConfig(design.arc, minValue, maxValue) : undefined,
    ...pointerProps,
    labels: {
      valueLabel,
      tickLabels,
    },
  }) as GaugeComponentProps;
}
