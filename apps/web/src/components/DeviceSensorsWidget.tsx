"use client";

import { useEffect, useMemo, useState } from "react";
import type { WidgetElementId, WidgetAppearanceConfig } from "@/types/dashboard";
import { DEFAULT_DEVICE_SENSORS_ELEMENTS } from "@/types/dashboard";
import {
  getReadingsLayoutClass,
  getValueFontClass,
  getWidgetShellClasses,
} from "@/lib/widget-appearance";
import { cn } from "@/lib/utils";
import { MultiSensorChart } from "@/components/MultiSensorChart";
import { WidgetTitleBar } from "@/components/dashboard/WidgetTitleBar";
import { seriesColorForSensor, type HistoryPoint } from "@/lib/multi-sensor-chart";

export interface DeviceSensorMeta {
  id: string;
  name: string;
  unit: string | null;
  sensorType: string;
  deviceId: string;
  deviceName: string;
  roomName: string | null;
}

interface ReadingRow {
  sensorId: string;
  latest: number | null;
  updatedAt: string | null;
  isLive?: boolean;
  source?: string | null;
}

function formatAge(isoTime: string): string {
  const ageMs = Date.now() - new Date(isoTime).getTime();
  if (ageMs < 60_000) return "just now";
  const mins = Math.floor(ageMs / 60_000);
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function sensorIcon(sensorType: string): string {
  const t = sensorType.toLowerCase();
  if (t.includes("temp")) return "🌡️";
  if (t.includes("humid")) return "💧";
  if (t.includes("press")) return "🌀";
  return "📊";
}

function sortSensors(items: DeviceSensorMeta[]): DeviceSensorMeta[] {
  const order = ["temperature", "humidity", "pressure"];
  return [...items].sort((a, b) => {
    const ai = order.findIndex((o) => a.sensorType.toLowerCase().includes(o));
    const bi = order.findIndex((o) => b.sensorType.toLowerCase().includes(o));
    const ar = ai === -1 ? 99 : ai;
    const br = bi === -1 ? 99 : bi;
    if (ar !== br) return ar - br;
    return a.name.localeCompare(b.name);
  });
}

export function DeviceSensorsWidget({
  title,
  deviceName,
  roomName,
  sensorIds,
  sensors,
  elements = DEFAULT_DEVICE_SENSORS_ELEMENTS,
  appearance,
  rowSpan = 1,
  editPreview = false,
}: {
  title?: string;
  deviceName: string;
  roomName?: string | null;
  sensorIds: string[];
  sensors: DeviceSensorMeta[];
  elements?: WidgetElementId[];
  appearance?: WidgetAppearanceConfig;
  rowSpan?: number;
  editPreview?: boolean;
}) {
  const items = useMemo(
    () => sortSensors(sensorIds.map((id) => sensors.find((s) => s.id === id)).filter(Boolean) as DeviceSensorMeta[]),
    [sensorIds, sensors]
  );

  const [readings, setReadings] = useState<Record<string, ReadingRow>>({});
  const [histories, setHistories] = useState<Record<string, HistoryPoint[]>>({});
  const [expanded, setExpanded] = useState(true);

  const activeElements = editPreview
    ? elements.filter((id) => id !== "chart_button")
    : elements;

  async function fetchData() {
    const latestRes = await fetch("/api/readings/latest");
    if (latestRes.ok) {
      const all = await latestRes.json();
      if (Array.isArray(all)) {
        const map: Record<string, ReadingRow> = {};
        for (const row of all) {
          if (sensorIds.includes(row.sensorId)) {
            map[row.sensorId] = row;
          }
        }
        setReadings(map);
      }
    }

    if (editPreview) return;

    const historyResults = await Promise.all(
      sensorIds.map(async (id) => {
        const res = await fetch(`/api/readings?sensorId=${id}&hours=24`);
        if (!res.ok) return { id, history: [] as HistoryPoint[] };
        const data = await res.json();
        return { id, history: (data.history || []) as HistoryPoint[] };
      })
    );

    const histMap: Record<string, HistoryPoint[]> = {};
    for (const { id, history } of historyResults) {
      histMap[id] = history;
    }
    setHistories(histMap);
  }

  useEffect(() => {
    fetchData();
    if (editPreview) return;
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [sensorIds.join(","), editPreview]);

  const anyLive = items.some((s) => readings[s.id]?.isLive);
  const latestUpdate = items
    .map((s) => readings[s.id]?.updatedAt)
    .filter(Boolean)
    .sort()
    .pop();

  const statusBlock =
    latestUpdate && anyLive ? (
      <p className="text-xs text-muted-foreground">
        Live · {formatAge(latestUpdate!)}
      </p>
    ) : latestUpdate ? (
      <p className="text-xs text-destructive">No recent data — {formatAge(latestUpdate)}</p>
    ) : null;

  const chartSeries = items.map((s, index) => ({
    id: s.id,
    key: `s_${s.id.slice(0, 8)}`,
    label: s.name,
    unit: s.unit,
    color: seriesColorForSensor(s.sensorType, s.name, index),
    points: histories[s.id] || [],
  }));

  const displayTitle = title || deviceName;

  if (editPreview) {
    return (
      <div className="h-full overflow-hidden rounded-lg border border-border/50 bg-muted/30 p-3">
        {activeElements.includes("title") && (
          <p className="truncate text-sm font-semibold text-foreground">{displayTitle}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {items.map((s) => s.name).join(" · ") || "No sensors on device"}
        </p>
        <p className="mt-2 text-[10px] text-muted-foreground">
          {items.length} reading{items.length === 1 ? "" : "s"} — combined chart in view mode
        </p>
      </div>
    );
  }

  function renderElement(id: WidgetElementId) {
    switch (id) {
      case "room_line":
        return (
          <p key={id} className="truncate text-xs text-muted-foreground">
            {roomName || "Unassigned"}
          </p>
        );
      case "device_name":
        return (
          <p key={id} className="truncate text-xs text-muted-foreground">
            {deviceName}
          </p>
        );
      case "title":
        return (
          <WidgetTitleBar key={id} title={displayTitle} />
        );
      case "value":
        return (
          <div key={id} className={getReadingsLayoutClass(appearance?.readingsLayout)}>
            {items.map((s) => {
              const r = readings[s.id];
              const inline = appearance?.readingsLayout === "inline";
              return (
                <div
                  key={s.id}
                  className={cn(
                    inline
                      ? "rounded-lg border border-border/60 bg-muted/20 px-3 py-1.5"
                      : "rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                  )}
                >
                  <p className="text-xs text-muted-foreground">
                    {sensorIcon(s.sensorType)} {s.name}
                  </p>
                  <p className={cn("mt-0.5 font-bold tabular-nums text-foreground", getValueFontClass(appearance?.fontSize))}>
                    {r?.latest !== null && r?.latest !== undefined ? (
                      <>
                        {r.latest}
                        {s.unit && (
                          <span className="ml-1 text-sm font-normal text-muted-foreground">
                            {s.unit}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-sm font-normal text-muted-foreground">—</span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        );
      case "status":
        return statusBlock ? <div key={id}>{statusBlock}</div> : null;
      case "chart_button":
        return (
          <div key={id} className="flex justify-end">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline"
            >
              {expanded ? "Hide chart" : "Show chart"}
            </button>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div
      className={cn(
        appearance
          ? getWidgetShellClasses(appearance)
          : "card flex h-full min-h-0 w-full flex-col overflow-hidden text-left",
        "flex h-full min-h-0 flex-col",
        rowSpan > 1 && !expanded && "justify-center"
      )}
    >
      <div className={cn("min-h-0 w-full", expanded ? "shrink-0" : "flex-1")}>
        <div className="space-y-3">
          {activeElements.map((id) => renderElement(id))}
        </div>
      </div>
      {expanded && elements.includes("chart_button") && (
        <div className="-mx-3 flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border px-1 pt-1">
          <div className="min-h-0 flex-1">
            <MultiSensorChart series={chartSeries} fillHeight compact />
          </div>
        </div>
      )}
    </div>
  );
}
