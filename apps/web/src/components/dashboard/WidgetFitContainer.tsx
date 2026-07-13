"use client";

import type { ReactNode } from "react";
import type { WidgetAppearanceConfig } from "@/types/dashboard";
import {
  WIDGET_FIT_BODY_REGION,
  WIDGET_FIT_INNER,
  WIDGET_FIT_INNER_CENTERED,
  WIDGET_FIT_ROOT,
  WIDGET_FIT_SCROLL_REGION,
} from "@/lib/dashboard-grid";
import { getWidgetShellClasses } from "@/lib/widget-appearance";
import { cn } from "@/lib/utils";

/** Outermost flex chain inside a dashboard grid cell — use once per widget in WidgetContent. */
export function WidgetFitRoot({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(WIDGET_FIT_ROOT, className)}>{children}</div>;
}

type WidgetFitShellProps = {
  appearance?: WidgetAppearanceConfig;
  editPreview?: boolean;
  centered?: boolean;
  scroll?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Appearance-aware shell (padding, border, variant).
 * Container queries come from the grid cell (`dashboard-widget-cell`), not this shell.
 */
export function WidgetFitShell({
  appearance,
  editPreview,
  centered,
  scroll,
  className,
  children,
}: WidgetFitShellProps) {
  const bodyClass = scroll
    ? WIDGET_FIT_SCROLL_REGION
    : centered
      ? cn(WIDGET_FIT_BODY_REGION, "items-center justify-center")
      : WIDGET_FIT_BODY_REGION;

  const innerClass = centered ? WIDGET_FIT_INNER_CENTERED : WIDGET_FIT_INNER;

  return (
    <div className={cn(getWidgetShellClasses(appearance, editPreview), className)}>
      <div className={innerClass}>
        <div className={bodyClass}>{children}</div>
      </div>
    </div>
  );
}
