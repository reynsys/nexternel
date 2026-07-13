"use client";

import { useEffect, useMemo, useState } from "react";

export interface PanelSensorMeta {
  id: string;
  name: string;
  unit: string | null;
  sensorType: string;
}

function sensorEmoji(sensorType: string): string {
  const t = sensorType.toLowerCase();
  if (t.includes("temp")) return "🌡️";
  if (t.includes("humid")) return "💧";
  if (t.includes("press")) return "🌀";
  return "📊";
}

function formatValue(latest: number | null, unit: string | null): string {
  if (latest === null || latest === undefined) return "—";
  const n = Number.isInteger(latest) ? String(latest) : latest.toFixed(1);
  return unit ? `${n} ${unit}` : n;
}

function sortSensors(items: PanelSensorMeta[]): PanelSensorMeta[] {
  const order = ["temperature", "humidity", "pressure"];
  return [...items].sort((a, b) => {
    const ai = order.findIndex((o) => a.sensorType.toLowerCase().includes(o));
    const bi = order.findIndex((o) => b.sensorType.toLowerCase().includes(o));
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.name.localeCompare(b.name);
  });
}

export function DevicePanelSensorStrip({
  sensorIds,
  sensors,
  editPreview = false,
}: {
  sensorIds: string[];
  sensors: PanelSensorMeta[];
  editPreview?: boolean;
}) {
  const items = useMemo(
    () =>
      sortSensors(
        sensorIds.map((id) => sensors.find((s) => s.id === id)).filter(Boolean) as PanelSensorMeta[]
      ),
    [sensorIds, sensors]
  );

  const [readings, setReadings] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (editPreview || items.length === 0) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/readings/latest");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const map: Record<string, number | null> = {};
        for (const row of data) {
          if (sensorIds.includes(row.sensorId)) {
            map[row.sensorId] = row.latest ?? null;
          }
        }
        setReadings(map);
      } catch {
        /* ignore */
      }
    }

    poll();
    const id = setInterval(poll, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [editPreview, items.length, sensorIds]);

  if (items.length === 0) return null;

  return (
    <div className="relay-panel-sensors flex shrink-0 flex-wrap gap-1 border-b border-border/40 px-1 py-1">
      {items.map((s) => (
        <span
          key={s.id}
          className="inline-flex items-center gap-0.5 rounded-md bg-muted/40 px-1.5 py-0.5 text-[10px] leading-tight sm:text-xs"
          title={s.name}
        >
          <span aria-hidden>{sensorEmoji(s.sensorType)}</span>
          <span className="font-medium tabular-nums">
            {editPreview
              ? s.sensorType.toLowerCase().includes("humid")
                ? "58 %"
                : "23.4 °C"
              : formatValue(readings[s.id] ?? null, s.unit)}
          </span>
        </span>
      ))}
    </div>
  );
}
