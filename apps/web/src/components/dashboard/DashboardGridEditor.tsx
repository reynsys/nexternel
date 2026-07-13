"use client";

import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DashboardCatalog } from "@/lib/dashboard-catalog";
import {
  parseCellAddress,
  detectOverlappingWidgetIds,
  columnLabels,
  formatCellAddress,
  isCellOccupied,
  widgetAtCellOrigin,
} from "@/lib/grid";
import { isReadingList } from "@/lib/readings";
import { useDashboard } from "@/components/layout/DashboardProvider";
import { WIDGET_CELL_CLASS } from "@/lib/dashboard-grid";
import type { DashboardLayoutDto, DashboardWidgetDto, WidgetConfig, WidgetElementId, WidgetType } from "@/types/dashboard";
import { resolveWidgetElements, isGenericWidgetType, CLASSIC_WIDGET_TYPES, WIDGET_TYPE_LABELS } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WidgetContent, widgetLabel } from "./WidgetContent";
import { WidgetEditor } from "./WidgetEditor";
import { WidgetDisplayEditor } from "./WidgetDisplayEditor";
import { WidgetAppearanceEditor } from "./WidgetAppearanceEditor";
import { GenericWidgetConfigEditor } from "./GenericWidgetConfigEditor";
import { WidgetPlacementEditor } from "./WidgetPlacementEditor";
import { WidgetBindingEditor } from "./WidgetBindingEditor";
import { useDashboardGridFit } from "@/hooks/use-dashboard-view-row-height";
import { useEditorWidgetContentScale } from "@/hooks/use-editor-widget-content-scale";
import { DashboardEditorScaledContent } from "./DashboardEditorScaledContent";
import { DashboardTabCustomizer } from "./DashboardTabCustomizer";
import { getDashboardTabIcon } from "@/lib/dashboard-tab-icons";
import { getCatalogEntry } from "@/library/widget-catalog";
import { widgetSupportsGaugeStudio, widgetUsesPlatformRenderer } from "@/widget-platform/resolve/instance";
import { cn } from "@/lib/utils";

export function DashboardGridEditor({
  catalog,
  deepLink,
}: {
  catalog: DashboardCatalog;
  deepLink?: { mode: "classic"; widgetType: string; deviceId?: string; relayId?: string };
}) {
  const { activeLayoutId, layouts, setActiveLayoutId, createLayout, refreshLayouts } =
    useDashboard();

  const [layout, setLayout] = useState<DashboardLayoutDto | null>(null);
  const [gridCols, setGridCols] = useState(4);
  const [gridRows, setGridRows] = useState(4);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(!!deepLink);
  const [error, setError] = useState("");
  const [readings, setReadings] = useState<
    { sensorId: string; updatedAt: string | null; isLive?: boolean }[]
  >([]);

  const loadLayout = useCallback(async () => {
    if (!activeLayoutId) return;
    setError("");
    const res = await fetch(`/api/dashboard/layout?layoutId=${activeLayoutId}`);
    if (!res.ok) {
      setError("Could not load dashboard layout");
      return;
    }
    const data: DashboardLayoutDto = await res.json();
    setLayout(data);
    setGridCols(data.columns);
    setGridRows(data.rows);
  }, [activeLayoutId]);

  useEffect(() => {
    setSelectedId(null);
    loadLayout();
  }, [loadLayout]);

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

  const selected = layout?.widgets.find((w) => w.id === selectedId) ?? null;

  async function saveGridSize() {
    if (!activeLayoutId) return;
    const res = await fetch("/api/dashboard/layout", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columns: gridCols, rows: gridRows, layoutId: activeLayoutId }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update grid size");
      return;
    }
    setLayout(await res.json());
  }

  async function updateWidget(id: string, patch: Partial<DashboardWidgetDto>) {
    const res = await fetch(`/api/dashboard/widgets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to update widget");
      await loadLayout();
      return;
    }
    const updated = await res.json();
    const shifted: { id: string; cell: string }[] = updated.shifted ?? [];
    setLayout((prev) => {
      if (!prev) return prev;
      const byId = new Map<string, string>();
      for (const s of shifted) byId.set(s.id, s.cell);
      return {
        ...prev,
        widgets: prev.widgets.map((w) => {
          if (w.id === id) {
            return { ...w, ...updated, config: updated.config as WidgetConfig };
          }
          const moved = byId.get(w.id);
          return moved ? { ...w, cell: moved } : w;
        }),
      };
    });
    setError("");
  }

  async function moveSelectedToCell(col: number, row: number) {
    if (!selectedId) return;
    await updateWidget(selectedId, { cell: formatCellAddress(col, row) });
  }

  async function deleteWidget(id: string) {
    const w = layout?.widgets.find((x) => x.id === id);
    const label = w ? widgetLabel(w, catalog.sensors, catalog.relays) : "widget";
    if (!confirm(`Delete "${label}"?`)) return;
    await fetch(`/api/dashboard/widgets/${id}`, { method: "DELETE" });
    setLayout((prev) =>
      prev ? { ...prev, widgets: prev.widgets.filter((w) => w.id !== id) } : prev
    );
    if (selectedId === id) setSelectedId(null);
  }

  async function handleNewDashboard() {
    const name = prompt("Dashboard name:", "New dashboard");
    if (!name?.trim()) return;
    await createLayout(name.trim());
    await refreshLayouts();
  }

  async function autoArrangeWidgets() {
    if (!activeLayoutId) return;
    const res = await fetch("/api/dashboard/layout/reflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layoutId: activeLayoutId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not auto-arrange widgets");
      return;
    }
    await loadLayout();
  }

  const [editorGridEl, setEditorGridEl] = useState<HTMLDivElement | null>(null);

  const {
    containerRef: editorContainerRef,
    rowTemplate: editorRowTemplate,
    gridAreaHeightPx,
    dataRowHeightPx,
  } = useDashboardGridFit(layout?.rows ?? gridRows, layout !== null, {
    headerRowPx: 28,
    matchViewportGridHeight: true,
    viewportHeightScale: 0.9,
  });

  const widgetContentScale = useEditorWidgetContentScale(
    layout?.columns ?? gridCols,
    layout?.rows ?? gridRows,
    dataRowHeightPx,
    editorGridEl,
    layout !== null
  );

  if (!layout) {
    return <p className="text-muted-foreground">Loading editor…</p>;
  }

  const overlappingIds = detectOverlappingWidgetIds(layout.widgets);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Edit dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Click a widget to edit it. Click an empty cell to move the selected widget there — other
            widgets shift automatically. Size is grid cells (W×H), not pixels.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/">← View dashboard</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg border p-1">
          {layouts.map((l) => {
            const Icon = getDashboardTabIcon(l.tabIcon);
            const showLabel = l.showTabLabel !== false;
            return (
              <Button
                key={l.id}
                type="button"
                size="sm"
                variant={activeLayoutId === l.id ? "secondary" : "ghost"}
                className={cn("gap-1.5 text-xs", !showLabel && "w-9 px-0")}
                onClick={() => setActiveLayoutId(l.id)}
                title={!showLabel ? l.name : undefined}
              >
                <Icon className="size-4 shrink-0" />
                {showLabel && <span className="max-w-[8rem] truncate">{l.name}</span>}
              </Button>
            );
          })}
          <Button type="button" size="sm" variant="ghost" className="text-xs" onClick={handleNewDashboard}>
            + New
          </Button>
        </div>
        <DashboardTabCustomizer />
        <Button type="button" size="sm" onClick={() => setShowAdd(true)}>
          + Add widget
        </Button>
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4 text-sm">
        <label className="text-muted-foreground">Columns</label>
        <input
          type="number"
          min={1}
          max={12}
          className="input w-16"
          value={gridCols}
          onChange={(e) => setGridCols(Number(e.target.value))}
        />
        <label className="text-muted-foreground">Rows</label>
        <input
          type="number"
          min={1}
          max={12}
          className="input w-16"
          value={gridRows}
          onChange={(e) => setGridRows(Number(e.target.value))}
        />
        <Button type="button" variant="outline" size="sm" onClick={saveGridSize}>
          Apply grid size
        </Button>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {overlappingIds.size > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-destructive/50 bg-destructive/5 p-4 text-sm">
          <p className="text-destructive">
            {overlappingIds.size} widget(s) overlap — use the list on the right to select them, or
            auto-arrange the grid.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={autoArrangeWidgets}>
            Auto-arrange widgets
          </Button>
        </Card>
      )}

      {showAdd && activeLayoutId && layout && (
        <WidgetEditor
          layoutId={activeLayoutId}
          columns={layout.columns}
          rows={layout.rows}
          catalog={catalog}
          existingWidgets={layout.widgets.map((w) => ({
            cell: w.cell,
            colSpan: w.colSpan,
            rowSpan: w.rowSpan,
          }))}
          initialClassic={
            deepLink?.mode === "classic"
              ? {
                  type: deepLink.widgetType as WidgetType,
                  deviceId: deepLink.deviceId,
                  relayId: deepLink.relayId,
                }
              : undefined
          }
          onCreated={async (w) => {
            setShowAdd(false);
            await loadLayout();
            setSelectedId(w.id);
          }}
          onClose={() => setShowAdd(false)}
        />
      )}

      <div className="grid min-h-0 gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <Card
          className="flex flex-col overflow-hidden p-4"
          style={gridAreaHeightPx ? { height: gridAreaHeightPx } : undefined}
        >
          <div ref={editorContainerRef} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
              ref={setEditorGridEl}
              className="grid h-full min-w-[320px] gap-2 md:gap-3"
              style={{
                gridTemplateColumns: `2.5rem repeat(${layout.columns}, minmax(0, 1fr))`,
                gridTemplateRows: editorRowTemplate,
              }}
            >
            <div />
            {columnLabels(layout.columns).map((letter) => (
              <div
                key={letter}
                className="flex items-center justify-center text-xs font-semibold text-muted-foreground"
              >
                {letter}
              </div>
            ))}

            {Array.from({ length: layout.rows }, (_, rowIdx) => (
              <Fragment key={`row-${rowIdx}`}>
                <div className="flex items-center justify-center text-xs font-semibold text-muted-foreground">
                  {rowIdx + 1}
                </div>
                {(() => {
                  const cells: ReactNode[] = [];
                  let col = 0;
                  while (col < layout.columns) {
                    const owner = widgetAtCellOrigin(col, rowIdx, layout.widgets);
                    if (owner) {
                      const origin = parseCellAddress(owner.cell);
                      const label = widgetLabel(owner, catalog.sensors, catalog.relays);
                      const isSelected = selectedId === owner.id;
                      const invalid = !origin;
                      const isOverlap = overlappingIds.has(owner.id);

                      cells.push(
                        <div
                          key={`w-${owner.id}`}
                          style={{
                            gridColumn: `${col + 2} / span ${owner.colSpan}`,
                            gridRow: `${rowIdx + 2} / span ${owner.rowSpan}`,
                          }}
                          className={cn(
                            WIDGET_CELL_CLASS,
                            "relative cursor-pointer rounded-lg transition-colors",
                            invalid
                              ? "border-2 border-destructive bg-destructive/10"
                              : isOverlap
                                ? "border-2 border-destructive bg-destructive/5 ring-2 ring-destructive/30"
                                : isSelected
                                  ? "border-2 border-primary bg-primary/5 shadow-md ring-1 ring-primary/20"
                                  : "border border-transparent hover:border-border/60"
                          )}
                          onClick={() => setSelectedId(owner.id)}
                        >
                          {isSelected ? (
                            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 border-b border-primary/20 bg-background/90 px-2 py-0.5 text-[10px] text-muted-foreground backdrop-blur-sm">
                              {invalid ? "Invalid cell — " : ""}
                              {label} · {owner.cell}
                            </div>
                          ) : null}
                          <DashboardEditorScaledContent
                            scale={
                              widgetUsesPlatformRenderer(owner)
                                ? 1
                                : widgetContentScale(owner.colSpan, owner.rowSpan)
                            }
                          >
                            <WidgetContent
                              widget={owner}
                              sensors={catalog.sensors}
                              relays={catalog.relays}
                              devices={catalog.devices}
                              readings={readings}
                            />
                          </DashboardEditorScaledContent>
                        </div>
                      );
                      col += owner.colSpan;
                    } else if (isCellOccupied(col, rowIdx, layout.widgets)) {
                      col += 1;
                    } else {
                      cells.push(
                        <button
                          key={`cell-${col}-${rowIdx}`}
                          type="button"
                          style={{ gridColumn: col + 2, gridRow: rowIdx + 2 }}
                          disabled={!selectedId}
                          onClick={() => moveSelectedToCell(col, rowIdx)}
                          className={cn(
                            "flex min-h-0 items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/10 transition-colors",
                            selectedId && "cursor-pointer hover:border-primary/50 hover:bg-primary/5"
                          )}
                          title={
                            selectedId
                              ? `Move selected widget to ${formatCellAddress(col, rowIdx)}`
                              : "Select a widget first"
                          }
                        >
                          <span className="text-[10px] font-medium text-muted-foreground/50">
                            {formatCellAddress(col, rowIdx)}
                          </span>
                        </button>
                      );
                      col += 1;
                    }
                  }
                  return cells;
                })()}
              </Fragment>
            ))}
            </div>
          </div>
        </Card>

        <Card
          className="overflow-y-auto p-4 lg:sticky lg:top-20"
          style={
            gridAreaHeightPx
              ? { height: gridAreaHeightPx, maxHeight: gridAreaHeightPx }
              : { maxHeight: "calc(100vh - 5rem)" }
          }
        >
          {layout.widgets.length > 0 && (
            <div className="mb-4 border-b border-border pb-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">All widgets</p>
              <ul className="max-h-40 space-y-1 overflow-y-auto">
                {layout.widgets.map((w) => {
                  const label = widgetLabel(w, catalog.sensors, catalog.relays);
                  const isOverlap = overlappingIds.has(w.id);
                  return (
                    <li key={w.id}>
                      <button
                        type="button"
                        className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                          selectedId === w.id
                            ? "bg-primary/15 text-foreground"
                            : "hover:bg-muted text-muted-foreground"
                        } ${isOverlap ? "text-destructive" : ""}`}
                        onClick={() => setSelectedId(w.id)}
                      >
                        {label} · {w.cell}
                        {isOverlap ? " (overlap)" : ""}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {!selected ? (
            <p className="text-sm text-muted-foreground">
              Click a widget on the grid, then use <strong className="text-foreground">Edit widget</strong>{" "}
              below to change title, source, placement, and appearance.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                <h2 className="text-sm font-semibold text-foreground">Edit widget</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {widgetLabel(selected, catalog.sensors, catalog.relays)}
                  {selected.type === "library" && selected.config.libraryId ? (
                    <>
                      {" "}
                      · {getCatalogEntry(selected.config.libraryId)?.label ?? "Library template"}
                    </>
                  ) : (
                    <> · {WIDGET_TYPE_LABELS[selected.type]}</>
                  )}
                </p>
                <p className="mt-1 text-[10px] text-primary">
                  Scroll down for Placement, Widget source, and Appearance — then click Apply on each section.
                </p>
                {widgetSupportsGaugeStudio(selected) && activeLayoutId ? (
                  <Button asChild size="sm" className="mt-2 w-full" variant="secondary">
                    <Link
                      href={`/admin/dashboard/studio/${selected.id}?layoutId=${activeLayoutId}`}
                    >
                      Open Widget Studio
                    </Link>
                  </Button>
                ) : null}
              </div>

              <WidgetPlacementEditor
                title={selected.title ?? ""}
                cell={selected.cell}
                colSpan={selected.colSpan}
                rowSpan={selected.rowSpan}
                maxColSpan={layout.columns}
                maxRowSpan={layout.rows}
                onApply={(patch) => {
                  setLayout((prev) =>
                    prev
                      ? {
                          ...prev,
                          widgets: prev.widgets.map((w) =>
                            w.id === selected.id ? { ...w, ...patch } : w
                          ),
                        }
                      : prev
                  );
                  updateWidget(selected.id, patch);
                }}
              />

              <WidgetBindingEditor
                widget={selected}
                catalog={catalog}
                onApply={(configPatch) => {
                  updateWidget(selected.id, {
                    config: { ...(selected.config ?? {}), ...configPatch },
                  });
                }}
              />

              {CLASSIC_WIDGET_TYPES.includes(selected.type) && (
                <WidgetDisplayEditor
                  widgetLabel={widgetLabel(selected, catalog.sensors, catalog.relays)}
                  widgetType={selected.type}
                  elements={resolveWidgetElements(selected.type, selected.config?.display)}
                  onSave={(elements: WidgetElementId[]) => {
                    updateWidget(selected.id, {
                      config: { ...(selected.config ?? {}), display: { ...selected.config?.display, elements } },
                    });
                  }}
                  onClose={() => {}}
                  inline
                />
              )}

              <WidgetAppearanceEditor
                widget={selected}
                catalog={catalog}
                readings={readings}
                appearance={selected.config?.appearance || {}}
                showChartOptions={
                  selected.type === "sensor" ||
                  selected.type === "device_sensors" ||
                  selected.type === "device_relays" ||
                  selected.type === "library"
                }
                showReadingsLayout={
                  selected.type === "device_sensors" ||
                  selected.type === "device_relays" ||
                  selected.type === "room_sensors"
                }
                onSave={(appearance) => {
                  updateWidget(selected.id, {
                    config: {
                      ...(selected.config ?? {}),
                      appearance,
                    },
                  });
                }}
              />

              {isGenericWidgetType(selected.type) && (
                <GenericWidgetConfigEditor
                  type={selected.type}
                  config={selected.config ?? {}}
                  onChange={(patch) => {
                    updateWidget(selected.id, {
                      config: { ...(selected.config ?? {}), ...patch },
                    });
                  }}
                />
              )}

              {selected.type === "library" && selected.config.libraryId && (
                <p className="text-xs text-muted-foreground">
                  Template: {selected.config.libraryId.replace(/-/g, " ")}
                </p>
              )}

              <Button type="button" variant="destructive" className="w-full" size="sm" onClick={() => deleteWidget(selected.id)}>
                Delete widget
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
