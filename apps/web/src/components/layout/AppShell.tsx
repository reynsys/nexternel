"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DashboardProvider } from "./DashboardProvider";
import { DamnSidebar } from "./damn-sidebar";
import { DamnHeader } from "./damn-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardParticles } from "@/components/effects/DashboardParticles";

export function AppShell({
  username,
  children,
  fillViewport = false,
}: {
  username?: string;
  children: ReactNode;
  /** Home dashboard: grid fills viewport without page scroll */
  fillViewport?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();
  const lockViewport = fillViewport || pathname?.includes("/admin/dashboard/studio/") === true;

  useEffect(() => {
    const handleResize = () => setOpen(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <DashboardProvider>
      <DashboardParticles />
      <TooltipProvider delayDuration={300}>
        <SidebarProvider open={open} onOpenChange={setOpen}>
          <DamnSidebar username={username} />
          <SidebarInset
            className={
              lockViewport
                ? "relative z-10 flex h-svh max-h-svh flex-col overflow-hidden"
                : "relative z-10 flex min-h-svh flex-col overflow-hidden"
            }
          >
            <DamnHeader />
            <main
              className={
                lockViewport
                  ? "flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6"
                  : "flex flex-1 flex-col overflow-y-auto p-4 md:p-6"
              }
            >
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </DashboardProvider>
  );
}
