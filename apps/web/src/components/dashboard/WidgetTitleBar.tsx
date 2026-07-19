import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WIDGET_FIT_TITLE } from "@/lib/dashboard-grid";
import { resolveWidgetIcon } from "@/lib/widget-icons";
import type { WidgetTitleMode } from "@/types/dashboard";

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
  titleClassName?: string;
  /** Optional right-side content (e.g. online count) — stays above the divider */
  trailing?: ReactNode;
}) {
  const Icon = resolveWidgetIcon(iconKey);
  const showTitle = titleMode !== "icon" && title.trim().length > 0;
  const showIcon = titleMode !== "title" && Icon;

  if (!showTitle && !showIcon && !trailing) return null;

  return (
    <div className={cn("widget-title-bar w-full shrink-0", className)}>
      <div className="flex min-w-0 items-center gap-2">
        {showIcon && Icon ? (
          <span className="widget-title-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-primary">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
        {showTitle ? (
          <p className={cn("min-w-0 flex-1 truncate", titleClassName ?? WIDGET_FIT_TITLE)}>
            {title}
          </p>
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
      {/* Solid inset rule + clearance below so content does not sit on the line */}
      <div className="widget-title-divider" aria-hidden />
    </div>
  );
}
