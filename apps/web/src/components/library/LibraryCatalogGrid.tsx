"use client";

import {
  catalogByCategory,
  type WidgetLibraryCategory,
  type WidgetLibraryId,
} from "@/library/widget-catalog";
import {
  GENERIC_WIDGET_LIBRARY,
  getGenericWidgetDefaults,
} from "@/library/generic-widget-catalog";
import { CLASSIC_WIDGET_LIBRARY } from "@/library/classic-widget-catalog";
import {
  GenericWidgetPreview,
  LibraryTemplatePreview,
} from "@/components/library/WidgetCatalogPreviews";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<WidgetLibraryCategory, string> = {
  switches: "Switches & relays",
  gauges: "Gauges",
  statistics: "Statistics cards",
  data: "Charts & history",
};

function PreviewFrame({
  children,
  tall = false,
}: {
  children: React.ReactNode;
  tall?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg border bg-muted/20",
        tall ? "h-64" : "h-52"
      )}
    >
      <div className="flex h-full w-full items-center justify-center p-3">
        <div className="h-full w-full max-h-full max-w-full overflow-hidden [&_.card]:shadow-none">
          <div className="mx-auto flex h-full w-full max-w-full items-center justify-center [&>*]:max-h-full [&>*]:w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LibraryCatalogGrid() {
  const categories: WidgetLibraryCategory[] = ["switches", "gauges", "statistics", "data"];

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Utility widgets</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Clock, weather, system info, and more. Add from Edit dashboard → Add widget → Utility
          widgets.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {GENERIC_WIDGET_LIBRARY.map((entry) => {
            const defaults = getGenericWidgetDefaults(entry.id);
            const tall = defaults.rowSpan > 1 || entry.id === "weather";
            return (
              <div key={entry.id} className="flex flex-col gap-3">
                <PreviewFrame tall={tall}>
                  <GenericWidgetPreview id={entry.id} />
                </PreviewFrame>
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="font-semibold text-foreground">{entry.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Default size: {defaults.colSpan}×{defaults.rowSpan} cells
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Classic dashboard widgets</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Sensor cards, relays, and device groups. Add from Edit dashboard → Add widget → Classic
          widgets.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CLASSIC_WIDGET_LIBRARY.map((entry) => (
            <div key={entry.id} className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold text-foreground">{entry.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Default size: {entry.defaultColSpan}×{entry.defaultRowSpan} cells
              </p>
            </div>
          ))}
        </div>
      </section>

      {categories.map((category) => {
        const items = catalogByCategory(category);
        if (items.length === 0) return null;
        return (
          <section key={category}>
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              {CATEGORY_LABELS[category]}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((entry) => {
                const tall = entry.defaultRowSpan > 1 || entry.defaultColSpan > 1;
                return (
                  <div key={entry.id} className="flex flex-col gap-3">
                    <PreviewFrame tall={tall}>
                      <LibraryTemplatePreview id={entry.id} />
                    </PreviewFrame>
                    <div className="rounded-lg border bg-card p-4">
                      <h3 className="font-semibold text-foreground">{entry.label}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Binds to: {entry.bindings.join(", ").replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Default size: {entry.defaultColSpan}×{entry.defaultRowSpan} cells
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
