"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardWidgetDto, WidgetAppearanceConfig } from "@/types/dashboard";
import type { DashboardCatalog } from "@/lib/dashboard-catalog";
import type {
  WidgetChartType,
  WidgetFontSize,
  WidgetPadding,
  WidgetReadingsLayout,
  WidgetShape,
  WidgetVariant,
} from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import { WidgetContent } from "@/components/dashboard/WidgetContent";
import { WIDGET_ICON_OPTIONS } from "@/lib/widget-icons";
import type { WidgetTitleMode } from "@/types/dashboard";
import { cn } from "@/lib/utils";

const labelClass = "text-xs font-medium text-muted-foreground";

const FONT_OPTIONS: { id: WidgetFontSize; sample: string }[] = [
  { id: "xs", sample: "Aa" },
  { id: "sm", sample: "Aa" },
  { id: "md", sample: "Aa" },
  { id: "lg", sample: "Aa" },
  { id: "xl", sample: "Aa" },
];

const FONT_PREVIEW: Record<WidgetFontSize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

const SHAPE_OPTIONS: { id: WidgetShape; className: string }[] = [
  { id: "default", className: "rounded-md" },
  { id: "soft", className: "rounded-lg" },
  { id: "pill", className: "rounded-2xl" },
  { id: "sharp", className: "rounded-none" },
];

const VARIANT_OPTIONS: { id: WidgetVariant; className: string }[] = [
  { id: "default", className: "bg-card border border-border" },
  { id: "filled", className: "bg-muted" },
  { id: "outline", className: "bg-transparent border border-border" },
  { id: "glass", className: "bg-black/30 backdrop-blur-sm border border-white/10" },
];

const CHART_OPTIONS: { id: WidgetChartType; label: string }[] = [
  { id: "line", label: "∿" },
  { id: "area", label: "▲" },
  { id: "bar", label: "▮" },
];

const TITLE_MODE_OPTIONS: { id: WidgetTitleMode; label: string }[] = [
  { id: "both", label: "Icon + title" },
  { id: "title", label: "Title only" },
  { id: "icon", label: "Icon only" },
];

const LAYOUT_OPTIONS: { id: WidgetReadingsLayout; label: string }[] = [
  { id: "stack", label: "▭" },
  { id: "grid-2", label: "▭▭" },
  { id: "grid-3", label: "▭▭▭" },
  { id: "inline", label: "→" },
];

function ChipRow<T extends string>({
  label,
  options,
  value,
  onPick,
  render,
}: {
  label: string;
  options: { id: T }[];
  value: T;
  onPick: (id: T) => void;
  render: (opt: { id: T }, active: boolean) => React.ReactNode;
}) {
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onPick(opt.id)}
              className={cn(
                "rounded-md border px-2 py-1.5 transition-colors",
                active ? "border-primary bg-primary/15" : "border-border hover:bg-muted"
              )}
            >
              {render(opt, active)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WidgetAppearanceEditor({
  widget,
  catalog,
  readings = [],
  appearance,
  onSave,
  showChartOptions = false,
  showReadingsLayout = false,
}: {
  widget: DashboardWidgetDto;
  catalog: DashboardCatalog;
  readings?: { sensorId: string; updatedAt: string | null; isLive?: boolean }[];
  appearance: WidgetAppearanceConfig;
  onSave: (appearance: WidgetAppearanceConfig) => void;
  showChartOptions?: boolean;
  showReadingsLayout?: boolean;
}) {
  const [local, setLocal] = useState<WidgetAppearanceConfig>(appearance);

  useEffect(() => {
    setLocal(appearance);
  }, [appearance, widget.id]);

  function patch(p: Partial<WidgetAppearanceConfig>) {
    setLocal((prev) => ({ ...prev, ...p }));
  }

  const previewWidget = useMemo<DashboardWidgetDto>(
    () => ({
      ...widget,
      config: {
        ...(widget.config ?? {}),
        appearance: local,
      },
    }),
    [widget, local]
  );

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3 text-xs">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-foreground">Appearance</p>
        <Button type="button" size="sm" className="h-7 text-xs" onClick={() => onSave(local)}>
          Apply
        </Button>
      </div>

      <div>
        <p className={labelClass}>Preview</p>
        <div className="mt-1.5 max-h-56 overflow-auto rounded-lg border bg-background/50 p-1">
          <WidgetContent
            widget={previewWidget}
            sensors={catalog.sensors}
            relays={catalog.relays}
            devices={catalog.devices}
            readings={readings}
            editPreview
          />
        </div>
      </div>

      <ChipRow
        label="Font size"
        options={FONT_OPTIONS}
        value={local.fontSize || "md"}
        onPick={(id) => patch({ fontSize: id })}
        render={(opt) => (
          <span className={cn("font-bold tabular-nums", FONT_PREVIEW[opt.id])}>
            {FONT_OPTIONS.find((f) => f.id === opt.id)?.sample}
          </span>
        )}
      />

      <ChipRow
        label="Shape"
        options={SHAPE_OPTIONS}
        value={local.shape || "default"}
        onPick={(id) => patch({ shape: id })}
        render={(opt) => (
          <span
            className={cn(
              "inline-block h-6 w-10 border border-border bg-muted",
              SHAPE_OPTIONS.find((s) => s.id === opt.id)?.className
            )}
          />
        )}
      />

      <ChipRow
        label="Style"
        options={VARIANT_OPTIONS}
        value={local.variant || "default"}
        onPick={(id) => patch({ variant: id })}
        render={(opt) => (
          <span
            className={cn(
              "inline-block h-6 w-10",
              VARIANT_OPTIONS.find((v) => v.id === opt.id)?.className
            )}
          />
        )}
      />

      <div>
        <p className={labelClass}>Padding</p>
        <select
          className="input mt-1 w-full"
          value={local.padding || "normal"}
          onChange={(e) => patch({ padding: e.target.value as WidgetPadding })}
        >
          <option value="compact">Compact</option>
          <option value="normal">Normal</option>
          <option value="roomy">Roomy</option>
        </select>
      </div>

      <ChipRow
        label="Title display"
        options={TITLE_MODE_OPTIONS}
        value={local.titleMode || "both"}
        onPick={(id) => patch({ titleMode: id })}
        render={(opt) => (
          <span className="text-[10px] font-medium">
            {TITLE_MODE_OPTIONS.find((t) => t.id === opt.id)?.label}
          </span>
        )}
      />

      <div>
        <p className={labelClass}>Title icon</p>
        <div className="mt-1.5 grid max-h-28 grid-cols-6 gap-1 overflow-y-auto">
          <button
            type="button"
            onClick={() => patch({ titleIcon: undefined })}
            className={cn(
              "rounded border px-1 py-1.5 text-[9px] text-muted-foreground",
              !local.titleIcon ? "border-primary bg-primary/15" : "border-border"
            )}
          >
            None
          </button>
          {WIDGET_ICON_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = local.titleIcon === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                title={opt.label}
                onClick={() => patch({ titleIcon: opt.id })}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded border p-1",
                  active ? "border-primary bg-primary/15" : "border-border hover:bg-muted"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      </div>

      {showChartOptions && (
        <ChipRow
          label="Chart type"
          options={CHART_OPTIONS}
          value={local.chartType || "line"}
          onPick={(id) => patch({ chartType: id })}
          render={(opt) => (
            <span className="text-base font-medium">
              {CHART_OPTIONS.find((c) => c.id === opt.id)?.label}
            </span>
          )}
        />
      )}

      {showReadingsLayout && (
        <ChipRow
          label="Readings layout"
          options={LAYOUT_OPTIONS}
          value={local.readingsLayout || "grid-2"}
          onPick={(id) => patch({ readingsLayout: id })}
          render={(opt) => (
            <span className="font-mono text-sm">
              {LAYOUT_OPTIONS.find((l) => l.id === opt.id)?.label}
            </span>
          )}
        />
      )}

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={local.showBorder !== false}
          onChange={(e) => patch({ showBorder: e.target.checked })}
        />
        Show border
      </label>
    </div>
  );
}
