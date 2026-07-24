import type { EchartsBuildCtx } from "./types";

/** Official demos assume ~360px canvas; scale lengths/fonts for widget cells. */
export function gaugeScale(ctx: EchartsBuildCtx): number {
  const px = ctx.sizePx ?? 220;
  return Math.min(1.15, Math.max(0.35, px / 360));
}

export function gs(ctx: EchartsBuildCtx, n: number, min = 1): number {
  return Math.max(min, Math.round(n * gaugeScale(ctx)));
}

export function fmtValue(ctx: EchartsBuildCtx, v: number): string {
  const n = Number.isInteger(v) ? String(v) : v.toFixed(1);
  return ctx.unit ? `${n} ${ctx.unit}` : n;
}

/** Axis tick labels — never show long floats like 16.666666. */
export function fmtAxisLabel(v: number): string {
  if (!Number.isFinite(v)) return "";
  const rounded = Math.round(v * 1000) / 1000;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-6) {
    return String(Math.round(rounded));
  }
  const one = Math.round(rounded * 10) / 10;
  if (Math.abs(one - rounded) < 1e-6) return one.toFixed(1);
  return (Math.round(rounded * 100) / 100).toFixed(2);
}

export function accentOf(ctx: EchartsBuildCtx, fallback = "#5470c6"): string {
  return ctx.accent || fallback;
}

/** Round a rough step to 1 / 2 / 5 × 10^n (classic “nice” tick step). */
function niceStep(rough: number): number {
  const x = Math.abs(rough) || 1;
  const exp = Math.floor(Math.log10(x));
  const f = x / 10 ** exp;
  let nf: number;
  if (f <= 1) nf = 1;
  else if (f <= 2) nf = 2;
  else if (f <= 5) nf = 5;
  else nf = 10;
  return nf * 10 ** exp;
}

/**
 * Snap min/max/splitNumber so every tick is a clean number
 * (e.g. 0,5,10,… not 16.666666).
 */
export function niceGaugeAxis(
  ctx: EchartsBuildCtx,
  preferredSplits = 6
): { min: number; max: number; splitNumber: number } {
  const s = gaugeScale(ctx);
  let target = preferredSplits;
  if (s < 0.5) target = Math.min(4, preferredSplits);
  else if (s < 0.75) target = Math.min(6, preferredSplits);
  target = Math.max(2, target);

  let min = ctx.min;
  let max = ctx.max;
  if (!(max > min)) max = min + 1;

  const span = max - min;
  let step = niceStep(span / target);

  // Prefer integer steps when the range is “sensor-sized”
  if (span >= 5 && step < 1) step = 1;

  let niceMin = Math.floor(min / step) * step;
  let niceMax = Math.ceil(max / step) * step;
  if (niceMax <= niceMin) niceMax = niceMin + step;

  let splitNumber = Math.round((niceMax - niceMin) / step);
  if (splitNumber < 2) {
    splitNumber = 2;
    niceMax = niceMin + step * 2;
  }

  // Too many ticks in a small cell → coarsen the step
  const maxSplits = s < 0.55 ? 5 : s < 0.8 ? 8 : 12;
  while (splitNumber > maxSplits) {
    step = niceStep(step * 2);
    niceMin = Math.floor(min / step) * step;
    niceMax = Math.ceil(max / step) * step;
    if (niceMax <= niceMin) niceMax = niceMin + step;
    splitNumber = Math.round((niceMax - niceMin) / step);
    if (splitNumber < 2) {
      splitNumber = 2;
      break;
    }
  }

  // Avoid floating junk on bounds
  const fix = (n: number) => Math.round(n * 1e6) / 1e6;
  return {
    min: fix(niceMin),
    max: fix(niceMax),
    splitNumber,
  };
}

export type GaugeLayoutId = "full" | "semi" | "temp" | "ring";

/** Placement that fills the chart host (radius % of min(width,height)). */
export function gaugeLayout(id: GaugeLayoutId): {
  center: [string, string];
  radius: string;
} {
  switch (id) {
    case "temp":
      // Official center 50%/60%; use near-full radius so the dial isn't tiny in the cell
      return { center: ["50%", "58%"], radius: "95%" };
    case "semi":
      return { center: ["50%", "70%"], radius: "100%" };
    case "ring":
      return { center: ["50%", "50%"], radius: "90%" };
    default:
      return { center: ["50%", "52%"], radius: "90%" };
  }
}

function clampRadius(radius: unknown, maxPct = 100): string {
  if (typeof radius !== "string") return "90%";
  const m = radius.match(/^(\d+(?:\.\d+)?)%$/);
  if (!m) return radius;
  const n = Number(m[1]);
  // Never shrink a preset below ~85% — empty widget space was from radius 75% + undersized host
  return `${Math.min(Math.max(n, 85), maxPct)}%`;
}

function ensureCenter(center: unknown): [string, string] {
  if (Array.isArray(center) && center.length >= 2) {
    return [String(center[0]), String(center[1])];
  }
  return ["50%", "54%"];
}

/**
 * Post-process any gauge option so EVERY series gets:
 * - nice min/max/splitNumber (no 16.666… ticks)
 * - fmtAxisLabel on visible axis labels
 * - radius capped so outer ticks are not clipped
 *
 * Grade gauges that intentionally use 0–1 are left on that scale.
 */
export function enforceAllGaugeSeries(
  option: Record<string, unknown>,
  ctx: EchartsBuildCtx
): Record<string, unknown> {
  const series = option.series;
  if (!Array.isArray(series)) return option;

  const nice = niceGaugeAxis(ctx, ctx.splitNumber ?? 8);

  return {
    ...option,
    series: series.map((raw) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
      const s = raw as Record<string, unknown>;
      if (s.type !== "gauge") return s;

      const gradeScale = s.min === 0 && s.max === 1;
      const axisLabelRaw = s.axisLabel;
      const axisLabel =
        axisLabelRaw && typeof axisLabelRaw === "object" && !Array.isArray(axisLabelRaw)
          ? { ...(axisLabelRaw as Record<string, unknown>) }
          : {};

      // Ring / multi-title use a fixed 0–100 percent scale with labels hidden
      const percentScale =
        s.min === 0 && s.max === 100 && axisLabel.show === false;

      if (axisLabel.show !== false) {
        axisLabel.formatter = fmtAxisLabel;
      }

      return {
        ...s,
        ...(gradeScale || percentScale
          ? {}
          : {
              min: nice.min,
              max: nice.max,
              splitNumber:
                typeof s.splitNumber === "number" && (s.splitNumber as number) >= 2
                  ? niceGaugeAxis(
                      { ...ctx, min: nice.min, max: nice.max },
                      s.splitNumber as number
                    ).splitNumber
                  : nice.splitNumber,
            }),
        radius: clampRadius(s.radius, 100),
        center: ensureCenter(s.center),
        axisLabel,
      };
    }),
  };
}

/** @deprecated use niceGaugeAxis */
export function splitNumberFor(ctx: EchartsBuildCtx, preferred = 8): number {
  return niceGaugeAxis(ctx, preferred).splitNumber;
}
