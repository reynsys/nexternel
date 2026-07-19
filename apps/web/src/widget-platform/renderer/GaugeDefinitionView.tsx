"use client";

import { useEffect, useState } from "react";
import type { WidgetAppearanceConfig } from "@/types/dashboard";
import type { GaugePlatformInstance } from "@/widget-platform/types";
import { sensorIdFromBinding } from "@/widget-platform/types";
import { buildGaugeComponentProps } from "@/widget-platform/definitions/gauge/build-props";
import { GaugePrimitive } from "@/widget-platform/renderer/GaugePrimitive";
import { WidgetTitleBar } from "@/components/dashboard/WidgetTitleBar";
import { gaugeRangeForSensor } from "@/library/widgets/gauges/gauge-utils";
import { liveStatusText, type LiveReading } from "@/lib/library-bindings";
import { iconForSensorType } from "@/lib/library-icons";
import { WIDGET_FIT_GAUGE } from "@/lib/dashboard-grid";
import { getWidgetShellClasses } from "@/lib/widget-appearance";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface SensorMeta {
  id: string;
  name: string;
  unit: string | null;
  sensorType: string;
  deviceName: string;
  roomName: string | null;
}

export function GaugeDefinitionView({
  instance,
  title,
  sensors,
  appearance,
  editPreview = false,
  showHeader = true,
  className,
  previewValue = null,
}: {
  instance: GaugePlatformInstance;
  title?: string | null;
  sensors: SensorMeta[];
  appearance?: WidgetAppearanceConfig;
  editPreview?: boolean;
  showHeader?: boolean;
  className?: string;
  /** Studio override — animates dial without waiting for live sensor data */
  previewValue?: number | null;
}) {
  const sensorId = sensorIdFromBinding(instance.binding);
  const sensor = sensorId ? sensors.find((s) => s.id === sensorId) : undefined;

  const [reading, setReading] = useState<LiveReading | null>(null);

  useEffect(() => {
    if (editPreview || !sensorId) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/readings/latest");
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data) || cancelled) return;
        const row = data.find((r: LiveReading) => r.sensorId === sensorId);
        if (row) setReading(row);
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
  }, [editPreview, sensorId]);

  const displayTitle = title || sensor?.name || "Gauge";
  const subtitle = sensor?.roomName || sensor?.deviceName;
  const Icon: LucideIcon | undefined = sensor ? iconForSensorType(sensor.sensorType) : undefined;
  const status = liveStatusText(reading ?? undefined);

  let value = previewValue ?? reading?.latest ?? null;
  const unit = sensor?.unit ?? instance.format?.unit ?? null;

  if (editPreview && value === null) {
    const range = sensor
      ? gaugeRangeForSensor(sensor.sensorType, sensor.unit, 24)
      : { min: 0, max: 100 };
    value = (range.min + range.max) / 2;
  }

  // Value stays in the dial SVG (fill dial host — same path as Studio).
  const gaugeProps = buildGaugeComponentProps(instance, value, unit);

  return (
    <div
      className={cn(
        getWidgetShellClasses(appearance, editPreview),
        !appearance?.padding && "p-1.5",
        "flex h-full min-h-0 w-full flex-col gap-1",
        className
      )}
    >
      {showHeader ? (
        <WidgetTitleBar
          title={displayTitle}
          className="px-0"
          titleClassName="text-xs font-semibold leading-none"
          trailing={
            <div className="flex min-w-0 items-center gap-1.5">
              {subtitle ? (
                <span className="truncate text-[10px] leading-none text-muted-foreground">
                  {subtitle}
                </span>
              ) : null}
              {Icon ? (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/60">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              ) : null}
            </div>
          }
        />
      ) : null}

      <div className={cn(WIDGET_FIT_GAUGE, "min-h-0 flex-1 pt-0.5")}>
        <GaugePrimitive props={gaugeProps} layoutMode="cell" className="min-h-0 h-full flex-1" />
      </div>

      {status && showHeader ? (
        <p className="widget-show-when-tall shrink-0 truncate text-center text-[10px] leading-none text-muted-foreground">
          {status}
        </p>
      ) : null}
    </div>
  );
}
