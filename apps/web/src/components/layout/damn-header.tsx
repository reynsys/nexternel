"use client";

import { usePathname } from "next/navigation";
import { useDashboardOptional } from "@/components/layout/DashboardProvider";
import { DashboardTabBar } from "@/components/layout/DashboardTabBar";

export function DamnHeader() {
  const pathname = usePathname();
  const dashboard = useDashboardOptional();
  const isHome = pathname === "/";

  return (
    <header className="z-40 flex h-14 w-full shrink-0 items-center border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {isHome && dashboard ? (
        <DashboardTabBar />
      ) : (
        <div className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {pathname === "/admin/dashboard" && "Edit dashboard"}
          {pathname.startsWith("/admin/dashboard/studio") && "Widget Studio"}
          {pathname.startsWith("/admin/devices") && "Devices"}
          {pathname.startsWith("/admin/rooms") && "Areas"}
          {pathname.startsWith("/admin/automations") && "Automations"}
          {pathname.startsWith("/admin/themes") && "Themes"}
          {pathname.startsWith("/admin/library") && "Widget library"}
        </div>
      )}
    </header>
  );
}
