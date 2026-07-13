/**
 * Platform gauge cell layout — SINGLE SOURCE OF TRUTH.
 *
 * Do not add margin/offset/overflow tweaks elsewhere (build-props, globals.css, Studio).
 * See AGENTS.md § Platform gauge layout and .cursor/rules/damn-home-gauges.mdc.
 */

import type { GaugeDesignConfig, GaugeTypeId } from "@/widget-platform/types";

export type GaugeLayoutContext = "standard" | "compact" | "studio";

/** react-gauge-component getGaugeMarginByType — do not add bottom inset here. */
export const GAUGE_MARGINS_BY_TYPE: Record<
  GaugeTypeId,
  { top: number; bottom: number; left: number; right: number }
> = {
  semicircle: { top: 0.08, bottom: 0, left: 0.08, right: 0.08 },
  grafana: { top: 0.12, bottom: 0, left: 0.07, right: 0.07 },
  radial: { top: 0.07, bottom: 0, left: 0.07, right: 0.07 },
};

/** Width/height for dial frame — mirrors legacy SVG `preserveAspectRatio` fit in grid cells. */
export const GAUGE_ASPECT_RATIO: Record<GaugeTypeId, string> = {
  semicircle: "2 / 1.05",
  grafana: "2 / 1.1",
  radial: "1 / 1",
};

export function gaugeAspectRatio(type: GaugeTypeId): string {
  return GAUGE_ASPECT_RATIO[type] ?? GAUGE_ASPECT_RATIO.semicircle;
}

/**
 * Gauge Studio Live Preview — react-gauge-component SandboxEditor defaults.
 * @see Template/Component Lib/react-gauge-component-main/.../SandboxEditor.tsx
 */
export const GAUGE_STUDIO_PREVIEW_WIDTH_PX = 400;
export const GAUGE_STUDIO_PREVIEW_HEIGHT_PX = 300;
export const GAUGE_STUDIO_PREVIEW_MIN_WIDTH_PX = 200;
export const GAUGE_STUDIO_PREVIEW_MIN_HEIGHT_PX = 150;
/** Action button row under the dial (reference: dial host is calc(100% - 30px)). */
export const GAUGE_STUDIO_PREVIEW_ACTION_BAR_PX = 30;

export const GAUGE_STUDIO_DIAL_HOST_CLASS = "gauge-studio-dial-host";

export const GAUGE_DIAL_WRAP_CLASS = "gauge-dial-wrap";
export const GAUGE_DIAL_HOST_CLASS = "gauge-cell-dial-host";
export const GAUGE_ASPECT_SLOT_CLASS = "gauge-aspect-slot";
export const GAUGE_ASPECT_FRAME_CLASS = "gauge-aspect-frame";

type GaugeMargin =
  | number
  | { top: number; bottom: number; left: number; right: number };

export function resolveGaugeMargins(
  design: GaugeDesignConfig,
  gaugeType: GaugeTypeId,
  _layoutContext: GaugeLayoutContext = "standard"
): GaugeMargin {
  const m = design.marginInPercent;
  if (m === undefined) return GAUGE_MARGINS_BY_TYPE[gaugeType];
  if (typeof m === "number") {
    const side = Math.min(Math.max(m, 0.02), 0.1);
    if (gaugeType === "semicircle" || gaugeType === "grafana") {
      return { top: side, bottom: 0, left: side, right: side };
    }
    return m;
  }
  return m;
}

/** Compact cells: arc in SVG, numeric readout as HTML below the aspect frame. */
export function shouldHideGaugeValueLabel(context: GaugeLayoutContext): boolean {
  return context === "compact";
}
