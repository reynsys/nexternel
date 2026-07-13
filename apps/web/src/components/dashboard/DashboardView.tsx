"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardLayoutDto } from "@/types/dashboard";
import type { DashboardCatalog } from "@/lib/dashboard-catalog";
import { parseCellAddress } from "@/lib/grid";
import { isReadingList } from "@/lib/readings";
import { useDashboard } from "@/components/layout/DashboardProvider";
import { useDashboardViewGridFit } from "@/hooks/use-dashboard-view-row-height";
import { WIDGET_CELL_CLASS } from "@/lib/dashboard-grid";
import { WidgetContent } from "./WidgetContent";

export function DashboardView({ catalog }: { catalog: DashboardCatalog }) {
  const { activeLayoutId, layoutsLoading } = useDashboard();
  const [layout, setLayout] = useState<DashboardLayoutDto | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [readings, setReadings] = useState<
    { sensorId: string; updatedAt: string | null; isLive?: boolean }[]
  >([]);

  const loadLayout = useCallback(async () => {
    setLoadError("");
    setLoading(true);
    const url = activeLayoutId
      ? `/api/dashboard/layout?layoutId=${encodeURIComponent(activeLayoutId)}`
      : "/api/dashboard/layout";
    try {
      const res = await fetch(url);
      if (res.ok) {
        setLayout(await res.json());
        return;
      }
      setLayout(null);
      const body = await res.json().catch(() => ({}));
      setLoadError(body.error || "Could not load dashboard");
    } catch {
      setLayout(null);
      setLoadError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }, [activeLayoutId]);

  useEffect(() => {
    if (layoutsLoading) return;
    loadLayout();
  }, [loadLayout, layoutsLoading]);

  useEffect(() => {
    const tick = () => {
      fetch("/api/readings/latest")
        .then((r) => r.json())
        .then((data) => {
          if (isReadingList(data)) {
            setReadings(
              data.map((r) => ({
                sensorId: r.sensorId,
                updatedAt: r.updatedAt,
                isLive: r.isLive,
              }))
            );
          }
        })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  const viewGridReady = !!layout && layout.widgets.length > 0;
  const { containerRef, rowTemplate } = useDashboardViewGridFit(
    layout?.rows ?? 4,
    viewGridReady
  );

  if (loading || layoutsLoading) {
    return <p className="text-muted-foreground">Loading dashboard…</p>;
  }

  if (loadError || !layout) {
    return (
      <div className="card text-sm">
        <p className="text-destructive">{loadError || "Dashboard not available"}</p>
        <button type="button" className="btn-secondary mt-3 text-xs" onClick={loadLayout}>
          Retry
        </button>
      </div>
    );
  }

  if (layout.widgets.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">No widgets on this dashboard yet.</p>
        <a href="/admin/dashboard" className="btn-primary mt-4 inline-flex">
          Edit dashboard
        </a>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div
        className="grid h-full min-h-0 w-full flex-1 gap-2 md:gap-3"
        style={{
          gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
          gridTemplateRows: rowTemplate,
          alignItems: "stretch",
        }}
      >
      {layout.widgets.map((w) => {
        const origin = parseCellAddress(w.cell);
        if (!origin) return null;
        return (
          <div
            key={w.id}
            style={{
              gridColumn: `${origin.col + 1} / span ${w.colSpan}`,
              gridRow: `${origin.row + 1} / span ${w.rowSpan}`,
            }}
            className={WIDGET_CELL_CLASS}
          >
            <WidgetContent
              widget={w}
              sensors={catalog.sensors}
              relays={catalog.relays}
              devices={catalog.devices}
              readings={readings}
            />
          </div>
        );
      })}
      </div>
    </div>
  );
}
