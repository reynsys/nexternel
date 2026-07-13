"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { useDashboard } from "@/components/layout/DashboardProvider";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DASHBOARD_TAB_ICONS } from "@/lib/dashboard-tab-icons";

export function DashboardTabCustomizer() {
  const { layouts, activeLayoutId, updateLayout } = useDashboard();
  const active = layouts.find((l) => l.id === activeLayoutId);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tabIcon, setTabIcon] = useState("layout-dashboard");
  const [showTabLabel, setShowTabLabel] = useState(true);
  const [saving, setSaving] = useState(false);

  if (!active) return null;

  function openEditor() {
    setName(active!.name);
    setTabIcon(active!.tabIcon || "layout-dashboard");
    setShowTabLabel(active!.showTabLabel !== false);
    setOpen(true);
  }

  async function saveEditor() {
    setSaving(true);
    const ok = await updateLayout(active!.id, { name, tabIcon, showTabLabel });
    setSaving(false);
    if (ok) setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={openEditor}
        >
          <Pencil className="size-3.5" />
          Customize tab
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-foreground">Dashboard tab</h3>
            <p className="text-xs text-muted-foreground">
              Icon and label shown on the home dashboard tab bar.
            </p>
          </div>

          <div>
            <Label htmlFor="tab-name">Name</Label>
            <Input
              id="tab-name"
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label>Icon</Label>
            <div className="mt-2 grid max-h-40 grid-cols-5 gap-1 overflow-y-auto">
              {DASHBOARD_TAB_ICONS.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.label}
                    onClick={() => setTabIcon(item.id)}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-md border transition-colors hover:bg-muted",
                      tabIcon === item.id && "border-primary bg-primary/10"
                    )}
                  >
                    <ItemIcon className="size-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showTabLabel}
              onChange={(e) => setShowTabLabel(e.target.checked)}
              className="rounded border-border"
            />
            Show name on tab (off = icon only)
          </label>

          <Button
            type="button"
            className="w-full"
            size="sm"
            disabled={saving || !name.trim()}
            onClick={saveEditor}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
