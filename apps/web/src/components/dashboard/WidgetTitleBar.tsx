import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { resolveWidgetIcon } from "@/lib/widget-icons";
import type { WidgetTitleMode } from "@/types/dashboard";

/**
 * Shared widget chrome — same title row height + divider spacing on every widget.
 * Do not override with compact/mb/gap hacks per widget type.
 */
export function WidgetTitleBar({
  title,
  iconKey,
  titleMode = "both",
  className,
  titleClassName,
  trailing,
}: {
  title: string;
  iconKey?: string | null;
  titleMode?: WidgetTitleMode;
  className?: string;
  /** Extra classes only (colour etc.) — size comes from widget-fit-title */
  titleClassName?: string;
  /** Right-side meta (subtitle, count) — stays inside the fixed-height title row */
  trailing?: ReactNode;
}) {
  const Icon = resolveWidgetIcon(iconKey);
  const showTitle = titleMode !== "icon" && title.trim().length > 0;
  const showIcon = titleMode !== "title" && Icon;

  if (!showTitle && !showIcon && !trailing) return null;

  return (
    <div className={cn("widget-title-bar", className)}>
      <div className="widget-title-row">
        {showIcon && Icon ? (
          <span className="widget-title-icon">
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
        {showTitle ? (
          <p className={cn("widget-title-text", titleClassName)}>{title}</p>
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        {trailing ? <div className="widget-title-trailing">{trailing}</div> : null}
      </div>
      <div className="widget-title-divider" aria-hidden />
    </div>
  );
}
