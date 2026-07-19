"use client";

import { useEffect, useState } from "react";
import type { WidgetElementId, WidgetAppearanceConfig } from "@/types/dashboard";
import { DEFAULT_SENSOR_ELEMENTS } from "@/types/dashboard";
import {
  getTitleFontClass,
  getValueFontClass,
  getWidgetShellClasses,
} from "@/lib/widget-appearance";
import { WIDGET_FIT_BODY, WIDGET_FIT_VALUE } from "@/lib/dashboard-grid";
import { cn } from "@/lib/utils";
import { SensorChart } from "./SensorChart";
import { WidgetTitleBar } from "@/components/dashboard/WidgetTitleBar";

interface SensorCardProps {
  sensorId: string;
  name: string;
  unit?: string | null;
  sensorType: string;
  deviceName: string;
  roomName?: string | null;
  initialValue?: number | null;
  elements?: WidgetElementId[];
  appearance?: WidgetAppearanceConfig;
  rowSpan?: number;
  /** Simplified static preview while editing dashboard grid */
  editPreview?: boolean;
}

function formatAge(isoTime: string): string {
  const ageMs = Date.now() - new Date(isoTime).getTime();
  if (ageMs < 60_000) return "just now";
  const mins = Math.floor(ageMs / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

export function SensorCard({
  sensorId,
  name,
  unit,
  sensorType,
  deviceName,
  roomName,
  initialValue,
  elements = DEFAULT_SENSOR_ELEMENTS,
  appearance,
  rowSpan = 1,
  editPreview = false,
}: SensorCardProps) {
  const [latest, setLatest] = useState<number | null>(initialValue ?? null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [source, setSource] = useState<"mqtt" | "influx" | "retained" | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [history, setHistory] = useState<{ time: string; value: number }[]>([]);
  const [expanded, setExpanded] = useState(true);

  const activeElements = editPreview
    ? elements.filter((id) => id !== "chart_button")
    : elements;

  async function fetchData() {
    const [latestRes, historyRes] = await Promise.all([
      fetch("/api/readings/latest"),
      editPreview ? Promise.resolve(null) : fetch(`/api/readings?sensorId=${sensorId}&hours=24`),
    ]);

    if (latestRes.ok) {
      const all = await latestRes.json();
      if (Array.isArray(all)) {
        const match = all.find((r: { sensorId: string }) => r.sensorId === sensorId);
        if (match) {
          setLatest(match.latest);
          setUpdatedAt(match.updatedAt ?? null);
          setSource(match.source ?? null);
          setIsLive(!!match.isLive);
        }
      }
    }

    if (historyRes && historyRes.ok) {
      const data = await historyRes.json();
      setHistory(data.history || []);
    }
  }

  useEffect(() => {
    fetchData();
    if (editPreview) return;
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [sensorId, editPreview]);

  const icon = sensorType.includes("temp") ? "🌡️" : sensorType.includes("humid") ? "💧" : "📊";

  const statusBlock =
    updatedAt && isLive ? (
      <p className="text-xs text-muted-foreground">
        {source === "mqtt" ? "Live · " : "Updating · "}
        {formatAge(updatedAt)}
      </p>
    ) : updatedAt && !isLive ? (
      <p className="text-xs text-destructive">No recent data — {formatAge(updatedAt)}</p>
    ) : null;

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
          <WidgetTitleBar
            key={id}
            title={`${icon} ${name}`}
            titleClassName={cn("truncate text-foreground", titleClass)}
          />
        );
      case "value":
        return (
          <p key={id} className={cn("font-bold tabular-nums text-foreground", valueClass)}>
            {latest !== null ? (
              <>
                {latest}
                {unit && <span className="ml-1 text-base text-muted-foreground">{unit}</span>}
              </>
            ) : (
              <span className="text-base text-muted-foreground">—</span>
            )}
          </p>
        );
      case "status":
        return statusBlock ? <div key={id}>{statusBlock}</div> : null;
      case "chart_button":
        if (editPreview) return null;
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

  const shellClass = cn(
    editPreview
      ? getWidgetShellClasses(appearance, true)
      : cn(getWidgetShellClasses(appearance), !appearance?.variant && "card w-full"),
    "flex min-h-0 flex-col",
    rowSpan > 1 && !expanded && "justify-center"
  );

  const valueClass = appearance?.fontSize
    ? getValueFontClass(appearance.fontSize)
    : WIDGET_FIT_VALUE;
  const titleClass = appearance?.fontSize
    ? getTitleFontClass(appearance.fontSize)
    : "widget-fit-title";

  return (
    <div className={cn(shellClass, "flex min-h-0 flex-col")}>
      <div className={cn("w-full min-h-0", expanded ? "shrink-0" : "min-h-0 flex-1")}>
        <div className="space-y-0.5">
          {activeElements.map((id) => renderElement(id))}
        </div>
      </div>
      {!editPreview && expanded && elements.includes("chart_button") && (
        <div className="-mx-3 flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border px-1 pt-1">
          <div className="min-h-0 flex-1">
            <SensorChart
              data={history}
              unit={unit}
              chartType={appearance?.chartType}
              sensorType={sensorType}
              sensorName={name}
              fillHeight
            />
          </div>
        </div>
      )}
    </div>
  );
}
