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
}: {
  title: string;
  iconKey?: string | null;
  titleMode?: WidgetTitleMode;
  className?: string;
  titleClassName?: string;
}) {
  const Icon = resolveWidgetIcon(iconKey);
  const showTitle = titleMode !== "icon" && title.trim().length > 0;
  const showIcon = titleMode !== "title" && Icon;

  if (!showTitle && !showIcon) return null;

  return (
    <div className={cn("widget-title-bar mb-2 w-full shrink-0", className)}>
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
        ) : null}
      </div>
      <div
        className="mt-1.5 w-full border-b border-dashed border-border/80"
        aria-hidden
      />
    </div>
  );
}
