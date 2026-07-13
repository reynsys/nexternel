"use client";

import { useDashboard } from "@/components/layout/DashboardProvider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getDashboardTabIcon } from "@/lib/dashboard-tab-icons";

export function DashboardTabBar() {
  const { layouts, activeLayoutId, setActiveLayoutId, layoutsLoading, layoutsError, refreshLayouts } =
    useDashboard();

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {layoutsLoading ? (
        <p className="text-sm text-muted-foreground">Loading tabs…</p>
      ) : layouts.length === 0 ? (
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{layoutsError || "No dashboards"}</p>
          <Button type="button" size="sm" variant="outline" onClick={refreshLayouts}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-lg border p-1">
          {layouts.map((layout) => {
            const Icon = getDashboardTabIcon(layout.tabIcon);
            const isActive = layout.id === activeLayoutId;
            const showLabel = layout.showTabLabel !== false;

            const tabButton = (
              <Button
                key={layout.id}
                type="button"
                size="sm"
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "h-9 shrink-0 gap-1.5",
                  showLabel ? "px-3" : "w-9 px-0"
                )}
                onClick={() => setActiveLayoutId(layout.id)}
              >
                <Icon className="size-4 shrink-0" />
                {showLabel && (
                  <span className="max-w-[8rem] truncate text-xs">{layout.name}</span>
                )}
              </Button>
            );

            if (showLabel) return tabButton;

            return (
              <Tooltip key={layout.id}>
                <TooltipTrigger asChild>{tabButton}</TooltipTrigger>
                <TooltipContent>{layout.name}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
}
