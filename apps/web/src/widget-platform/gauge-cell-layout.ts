/**
 * Platform gauge cell layout — SINGLE SOURCE OF TRUTH.
 *
 * Do not add margin/offset/overflow tweaks elsewhere (build-props, globals.css, Studio).
 * See AGENTS.md § Platform gauge layout and .cursor/rules/damn-home-gauges.mdc.
 */

import type { GaugeDesignConfig, GaugeTypeId } from "@/widget-platform/types";

export type GaugeLayoutContext = "standard" | "compact" | "studio";

/**
 * Dashboard fill-host margins (Studio dial fills its box; we do the same in cells).
 * Modest bottom inset keeps the arc/value off the overflow edge.
 */
export const GAUGE_MARGINS_BY_TYPE: Record<
  GaugeTypeId,
  { top: number; bottom: number; left: number; right: number }
> = {
  semicircle: { top: 0.05, bottom: 0.05, left: 0.08, right: 0.08 },
  grafana: { top: 0.07, bottom: 0.05, left: 0.08, right: 0.08 },
  radial: { top: 0.06, bottom: 0.06, left: 0.06, right: 0.06 },
};

/** Pull valueLabel into the semicircle hollow (SVG px). */
export const GAUGE_VALUE_OFFSET_Y: Record<GaugeTypeId, number> = {
  semicircle: -22,
  grafana: -18,
  radial: 0,
};

/**
 * Prefer saved negative offsets; replace missing / large-positive offsets that
 * land the readout on the arc band in fill hosts.
 */
export function resolveValueLabelOffsetY(
  design: GaugeDesignConfig,
  gaugeType: GaugeTypeId
): number | undefined {
  if (gaugeType === "radial") {
    return design.labels?.valueLabel?.offsetY;
  }
  const saved = design.labels?.valueLabel?.offsetY;
  const fallback = GAUGE_VALUE_OFFSET_Y[gaugeType];
  if (saved === undefined) return fallback;
  // Large positive offsets (Studio) sit on the arc in dashboard fill cells.
  if (saved > 4) return fallback;
  return saved;
}

/**
 * Dial meet aspect (width / height).
 * ~1.7 keeps semicircles large while centering in tall cells (equal space above/below).
 */
export const GAUGE_ASPECT_RATIO: Record<GaugeTypeId, string> = {
  semicircle: "1.7 / 1",
  grafana: "1.7 / 1",
  radial: "1 / 1",
};

export function gaugeAspectRatio(type: GaugeTypeId): string {
  return GAUGE_ASPECT_RATIO[type] ?? GAUGE_ASPECT_RATIO.semicircle;
}

/** Full-size meet unused on dashboard (cells fill). Kept for tooling. */
export const GAUGE_MEET_INSET = 1;

export const GAUGE_STUDIO_PREVIEW_WIDTH_PX = 400;
export const GAUGE_STUDIO_PREVIEW_HEIGHT_PX = 300;
export const GAUGE_STUDIO_PREVIEW_MIN_WIDTH_PX = 200;
export const GAUGE_STUDIO_PREVIEW_MIN_HEIGHT_PX = 150;
/** Action button row under the Studio dial (reference: height calc(100% - 30px)). */
export const GAUGE_STUDIO_PREVIEW_ACTION_BAR_PX = 30;

export const GAUGE_STUDIO_DIAL_HOST_CLASS = "gauge-studio-dial-host";

export const GAUGE_DIAL_WRAP_CLASS = "gauge-dial-wrap";
export const GAUGE_DIAL_HOST_CLASS = "gauge-cell-dial-host";
/** @deprecated Dashboard uses fill, not meet. */
export const GAUGE_ASPECT_SLOT_CLASS = "gauge-aspect-slot";
/** @deprecated Dashboard uses fill, not meet. */
export const GAUGE_ASPECT_FRAME_CLASS = "gauge-aspect-frame";

type GaugeMargin =
  | number
  | { top: number; bottom: number; left: number; right: number };

function clampSide(value: number | undefined, fallback: number): number {
  return Math.min(Math.max(value ?? fallback, 0.07), 0.12);
}

function clampBottom(value: number | undefined, fallback: number): number {
  return Math.min(Math.max(value ?? fallback, 0.03), 0.08);
}

export function resolveGaugeMargins(
  design: GaugeDesignConfig,
  gaugeType: GaugeTypeId,
  _layoutContext: GaugeLayoutContext = "standard"
): GaugeMargin {
  const m = design.marginInPercent;
  const defaults = GAUGE_MARGINS_BY_TYPE[gaugeType];

  if (m === undefined) {
    return defaults;
  }

  if (typeof m === "number") {
    const side = clampSide(m, defaults.left);
    if (gaugeType === "semicircle" || gaugeType === "grafana") {
      return {
        top: Math.min(side, 0.1),
        bottom: clampBottom(undefined, defaults.bottom),
        left: side,
        right: side,
      };
    }
    return Math.min(Math.max(m, 0.05), 0.12);
  }

  if (gaugeType === "semicircle" || gaugeType === "grafana") {
    return {
      top: Math.min(Math.max(m.top ?? defaults.top, 0.04), 0.12),
      bottom: clampBottom(m.bottom, defaults.bottom),
      left: clampSide(m.left, defaults.left),
      right: clampSide(m.right, defaults.right),
    };
  }

  return m;
}

export function shouldHideGaugeValueLabel(context: GaugeLayoutContext): boolean {
  return context === "compact";
}
