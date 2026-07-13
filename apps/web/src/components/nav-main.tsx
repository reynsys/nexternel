"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  url: string;
  icon?: React.ReactNode;
  items?: NavItem[];
};

function isActive(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(url + "/");
}

function isParentActive(pathname: string, item: NavItem): boolean {
  if (!item.items) return false;
  return item.items.some((sub) => {
    if (sub.items) {
      return sub.items.some((child) => pathname.startsWith(child.url));
    }
    return pathname.startsWith(sub.url);
  });
}

function NavMainItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const parentActive = isParentActive(pathname, item);
  const [open, setOpen] = useState(parentActive);

  useEffect(() => {
    if (parentActive) setOpen(true);
  }, [parentActive, pathname]);

  if (item.items) {
    return (
      <Collapsible open={open} onOpenChange={setOpen} className="group">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="group" isActive={parentActive}>
              {item.icon}
              <span>{item.title}</span>
              <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.items.map((subItem) => {
                const subActive = isActive(pathname, subItem.url);
                return (
                  <SidebarMenuSubItem key={subItem.title}>
                    {subItem.items ? (
                      <Collapsible
                        className="group"
                        defaultOpen={subItem.items.some((child) =>
                          pathname.startsWith(child.url)
                        )}
                      >
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="group h-8 min-h-8 pl-6">
                            <span>{subItem.title}</span>
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {subItem.items.map((child) => (
                              <SidebarMenuButton
                                key={child.title}
                                asChild
                                isActive={isActive(pathname, child.url)}
                                className="h-8 min-h-8 pl-6"
                              >
                                <Link href={child.url}>{child.title}</Link>
                              </SidebarMenuButton>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={subActive}
                        className="h-8 min-h-8 pl-6"
                      >
                        <Link href={subItem.url}>{subItem.title}</Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive(pathname, item.url)}>
        <Link href={item.url}>
          {item.icon}
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <SidebarMenu className="px-3 py-2">
      {items.map((item) => (
        <NavMainItem key={item.title} item={item} pathname={pathname} />
      ))}
    </SidebarMenu>
  );
}
