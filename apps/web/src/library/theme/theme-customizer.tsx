"use client";

import { useState } from "react";
import { Palette, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { ThemeCustomizerPanel } from "@/library/theme/theme-customizer-panel";

/** Slide-out theme panel (legacy header trigger). Prefer Settings → Themes page. */
export function ThemeCustomizer({ variant = "header" }: { variant?: "header" | "sidebar" }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {variant === "sidebar" ? (
        <SidebarMenuButton tooltip="Themes" onClick={() => setOpen(true)}>
          <Palette className="size-4" />
          <span>Themes</span>
        </SidebarMenuButton>
      ) : null}

      {variant === "header" ? (
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            aria-label="Themes"
          >
            <Settings className="size-5" />
          </Button>
        </SheetTrigger>
      ) : null}

      <SheetContent side="right" className="w-80 text-foreground">
        <SheetHeader>
          <SheetTitle>Themes</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <ThemeCustomizerPanel />
        </div>
      </SheetContent>
    </Sheet>
  );
}
