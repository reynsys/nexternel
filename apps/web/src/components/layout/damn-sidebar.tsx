"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Home, LayoutGrid } from "lucide-react";
import { NavMain } from "@/components/nav-main";
import { DamnNavUser } from "@/components/layout/damn-nav-user";
import { APP_VERSION } from "@/lib/version";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

const navMain = [
  {
    title: "Home",
    url: "/",
    icon: <Home className="size-4" />,
  },
  {
    title: "Settings",
    url: "#",
    icon: <LayoutGrid className="size-4" />,
    items: [
      { title: "Edit dashboard", url: "/admin/dashboard" },
      { title: "Widget library", url: "/admin/library" },
      { title: "Devices", url: "/admin/devices" },
      { title: "Areas", url: "/admin/rooms" },
      { title: "Automations", url: "/admin/automations" },
      { title: "Themes", url: "/admin/themes" },
    ],
  },
];

type DamnSidebarProps = React.ComponentProps<typeof Sidebar> & {
  username?: string;
};

export function DamnSidebar({ username, ...props }: DamnSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props} className="shadow-lg">
      <SidebarHeader className="h-16 justify-center border-b px-2">
        <div className="flex w-full items-center gap-1">
          <SidebarMenu className="min-w-0 flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="p-2">
                <Link href="/">
                  <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Cpu className="size-4" />
                  </div>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">
                      Nexternel
                    </span>
                    <span className="truncate text-xs text-muted-foreground">Smart home</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarTrigger className="shrink-0 group-data-[collapsible=icon]:mx-auto" />
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-hidden">
        <ScrollArea className="h-full">
          <NavMain items={navMain} />
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="justify-center border-t px-3">
        <DamnNavUser username={username} />
        <p className="px-2 py-1 text-center font-mono text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          {APP_VERSION}
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
