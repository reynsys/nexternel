import type {
  WidgetAppearanceConfig,
  WidgetChartType,
  WidgetFontSize,
  WidgetPadding,
  WidgetReadingsLayout,
  WidgetShape,
  WidgetVariant,
} from "@/types/dashboard";
import { cn } from "@/lib/utils";

export const FONT_SIZE_VALUE: Record<WidgetFontSize, string> = {
  xs: "text-lg",
  sm: "text-2xl",
  md: "text-3xl",
  lg: "text-4xl",
  xl: "text-5xl",
};

export const FONT_SIZE_TITLE: Record<WidgetFontSize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

export const FONT_SIZE_BODY: Record<WidgetFontSize, string> = {
  xs: "text-[10px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

const SHAPE: Record<WidgetShape, string> = {
  default: "rounded-lg",
  sharp: "rounded-none",
  pill: "rounded-2xl",
  soft: "rounded-xl",
};

const PADDING: Record<WidgetPadding, string> = {
  compact: "p-2",
  normal: "p-3",
  roomy: "p-5",
};

const VARIANT: Record<WidgetVariant, string> = {
  default: "bg-card",
  filled: "bg-muted/60",
  outline: "bg-transparent",
  glass: "bg-black/20 backdrop-blur-sm",
};

const READINGS_GRID: Record<WidgetReadingsLayout, string> = {
  stack: "grid-cols-1",
  "grid-2": "grid-cols-1 sm:grid-cols-2",
  "grid-3": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  inline: "flex flex-wrap gap-2",
};

export function getValueFontClass(fontSize?: WidgetFontSize): string {
  return FONT_SIZE_VALUE[fontSize || "md"];
}

export function getTitleFontClass(fontSize?: WidgetFontSize): string {
  return FONT_SIZE_TITLE[fontSize || "md"];
}

export function getBodyFontClass(fontSize?: WidgetFontSize): string {
  return FONT_SIZE_BODY[fontSize || "md"];
}

export function getReadingsLayoutClass(layout?: WidgetReadingsLayout): string {
  if (layout === "inline") return READINGS_GRID.inline;
  return cn("grid gap-3", READINGS_GRID[layout || "grid-2"]);
}

export function getWidgetShellClasses(
  appearance?: WidgetAppearanceConfig,
  editPreview?: boolean
): string {
  const shape = SHAPE[appearance?.shape || "default"];
  const padding = PADDING[appearance?.padding || "normal"];
  const variant = editPreview ? "bg-muted/30" : VARIANT[appearance?.variant || "default"];
  const border =
    appearance?.showBorder === false
      ? "border-0"
      : editPreview
        ? "border border-border/50"
        : appearance?.variant === "outline"
          ? "border border-border"
          : "border border-border/40";

  return cn(
    "flex h-full w-full min-h-0 flex-col items-stretch justify-start overflow-hidden text-left",
    shape,
    padding,
    variant,
    border
  );
}

export function normalizeChartType(chartType?: WidgetChartType): WidgetChartType {
  return chartType || "line";
}
