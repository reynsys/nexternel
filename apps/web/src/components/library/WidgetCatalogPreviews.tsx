"use client";

import type { ReactNode } from "react";
import { Droplets, Thermometer } from "lucide-react";
import {
  catalogByCategory,
  catalogForBinding,
  relaysLayoutForLibraryId,
  type WidgetLibraryCategory,
  type WidgetLibraryId,
} from "@/library/widget-catalog";
import { CLASSIC_WIDGET_LIBRARY } from "@/library/classic-widget-catalog";
import type { WidgetType } from "@/types/dashboard";
import {
  GENERIC_WIDGET_LIBRARY,
  getGenericWidgetDefaults,
} from "@/library/generic-widget-catalog";
import type { GenericWidgetType } from "@/types/dashboard";
import {
  ActivityLogWidget,
  CalendarWidget,
  NetworkStatusWidget,
  SpeedTestWidget,
  SystemInfoWidget,
  TimeWidget,
  WeatherWidget,
} from "@/components/dashboard/widgets/GenericWidgets";
import GaussianStatCard from "@/library/widgets/statistics/GaussianStatCard";
import IconColorWidget from "@/library/widgets/statistics/IconColorWidget";
import ProgressStatCard from "@/library/widgets/data/ProgressStatCard";
import RadialStatCard from "@/library/widgets/data/RadialStatCard";
import AreaStatsCard from "@/library/widgets/data/AreaStatsCard";
import LineHistoryCard from "@/library/widgets/data/WebsiteVisitorsCard";
import { SemicircleNeedleGauge } from "@/library/widgets/gauges/SemicircleNeedleGauge";
import { RingGauge, SolidArcGauge } from "@/library/widgets/gauges/RingGauge";
import { SWITCH_LIBRARY_RENDERERS, SwitchDevicePanelPreview } from "@/library/widgets/switches/SwitchWidgets";
import { cn } from "@/lib/utils";

const DEMO_HISTORY = [
  { value: 21 },
  { value: 22 },
  { value: 22.5 },
  { value: 23 },
  { value: 22.8 },
  { value: 23.1 },
  { value: 23.4 },
];

const DEMO_TEMP_ZONES = [
  { from: 0, to: 18, color: "#3b82f6" },
  { from: 18, to: 24, color: "#22c55e" },
  { from: 24, to: 30, color: "#eab308" },
  { from: 30, to: 40, color: "#ef4444" },
];

const DEMO_PERCENT_ZONES = [
  { from: 0, to: 40, color: "#22c55e" },
  { from: 40, to: 70, color: "#eab308" },
  { from: 70, to: 100, color: "#ef4444" },
];

export function LibraryTemplatePreview({ id }: { id: WidgetLibraryId }) {
  if (id.startsWith("switch-device-")) {
    return <SwitchDevicePanelPreview layout={relaysLayoutForLibraryId(id)} />;
  }

  const SwitchPreview = SWITCH_LIBRARY_RENDERERS[id];
  if (SwitchPreview) {
    return (
      <SwitchPreview
        relayId="preview"
        name="Garden Relay 1"
        subtitle="Garden Relays"
        editPreview
      />
    );
  }

  switch (id) {
    case "gauge-semicircle":
      return (
        <SemicircleNeedleGauge
          title="Temperature"
          subtitle="Living Room"
          value={23.4}
          min={0}
          max={40}
          unit="°C"
          zones={DEMO_TEMP_ZONES}
          statusText="Live"
          icon={Thermometer}
        />
      );
    case "gauge-ring":
      return (
        <RingGauge
          title="Humidity"
          subtitle="Garden"
          value={58}
          min={0}
          max={100}
          unit="%"
          zones={DEMO_PERCENT_ZONES}
          statusText="Live"
          icon={Droplets}
        />
      );
    case "gauge-solid-arc":
      return (
        <SolidArcGauge
          title="Humidity"
          subtitle="Living Room"
          value={72}
          min={0}
          max={100}
          unit="%"
          zones={DEMO_PERCENT_ZONES}
          statusText="Live"
          icon={Droplets}
        />
      );
    case "gaussian-stat":
      return (
        <GaussianStatCard
          title="Living Room"
          subtitle="Temperature"
          value="23.4 °C"
          trendText="Live"
          icon={Thermometer}
          showMenu={false}
        />
      );
    case "icon-stat":
      return <IconColorWidget title="Humidity" value="58 %" icon={Droplets} />;
    case "progress-stat":
      return (
        <ProgressStatCard
          title="Humidity"
          value="58 %"
          progress={58}
          badgeText="Live"
          icon={Droplets}
        />
      );
    case "radial-stat":
      return (
        <div className="flex h-full w-full items-center justify-center py-2">
          <RadialStatCard
            title="Temperature"
            subtitle="Living Room"
            value={23}
            label="°C"
            trend="Live"
          />
        </div>
      );
    case "area-stats":
      return (
        <div className="h-full w-full min-h-[8rem]">
          <AreaStatsCard
            title="Temperature"
            value="23.4 °C"
            subtitle="+2.1% over 24h"
            data={DEMO_HISTORY}
          />
        </div>
      );
    case "line-history":
      return (
        <div className="h-full w-full min-h-[8rem]">
          <LineHistoryCard
            title="Temperature"
            value="23.4 °C"
            subtitle="+2.1% over 24h"
            data={DEMO_HISTORY}
          />
        </div>
      );
    default:
      return null;
  }
}

function TemplateCard({
  active,
  onClick,
  preview,
  label,
  description,
  sizeHint,
}: {
  active: boolean;
  onClick: () => void;
  preview: ReactNode;
  label: string;
  description: string;
  sizeHint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "overflow-hidden rounded-lg border text-left transition-colors",
        active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
      )}
    >
      <div className="pointer-events-none h-36 select-none overflow-hidden border-b bg-muted/20 p-2 sm:h-40">
        <div className="flex h-full w-full items-stretch justify-center overflow-hidden">
          {preview}
        </div>
      </div>
      <div className="p-3">
        <p className="font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">{sizeHint}</p>
      </div>
    </button>
  );
}

export function ClassicWidgetPreview({ type }: { type: WidgetType }) {
  switch (type) {
    case "sensor":
      return (
        <div className="flex h-full w-full flex-col justify-center rounded-lg border border-border/60 bg-card p-3 text-left">
          <p className="text-[10px] text-muted-foreground">Living Room</p>
          <p className="text-sm font-semibold">Temperature</p>
          <p className="mt-2 text-2xl font-bold">23.4 °C</p>
          <span className="mt-1 inline-flex w-fit rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-600">
            Live
          </span>
        </div>
      );
    case "relay":
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border border-border/60 bg-card p-3">
          <p className="text-sm font-semibold">Porch light</p>
          <div className="h-6 w-12 rounded-full bg-emerald-500/80" />
        </div>
      );
    case "room_sensors":
      return (
        <div className="grid h-full w-full grid-cols-2 gap-1 p-1">
          {["22.1 °C", "58 %"].map((v) => (
            <div
              key={v}
              className="flex flex-col justify-center rounded border border-border/60 bg-card p-2 text-center"
            >
              <p className="text-[10px] text-muted-foreground">Sensor</p>
              <p className="text-sm font-bold">{v}</p>
            </div>
          ))}
        </div>
      );
    case "device_sensors":
      return (
        <div className="flex h-full w-full flex-col justify-center gap-1 rounded-lg border border-border/60 bg-card p-3">
          <p className="text-xs font-semibold">Living Room ESP32</p>
          <p className="text-sm">🌡️ 22.1 °C</p>
          <p className="text-sm">💧 58 %</p>
        </div>
      );
    case "device_relays":
      return <SwitchDevicePanelPreview layout="list" />;
    case "device_status":
      return (
        <div className="flex h-full w-full flex-col justify-center gap-1 p-2">
          {["Garden Relays", "Living Room"].map((name, i) => (
            <div
              key={name}
              className="flex items-center justify-between rounded border border-border/60 bg-card px-2 py-1"
            >
              <span className="truncate text-[10px] font-medium">{name}</span>
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  i === 0 ? "bg-emerald-500" : "bg-muted-foreground/40"
                )}
              />
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

export function ClassicWidgetPicker({
  types,
  selected,
  onPick,
}: {
  types: WidgetType[];
  selected: WidgetType;
  onPick: (type: WidgetType) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {types.map((t) => {
        const entry = CLASSIC_WIDGET_LIBRARY.find((e) => e.id === t);
        if (!entry) return null;
        return (
          <TemplateCard
            key={t}
            active={selected === t}
            onClick={() => onPick(t)}
            preview={<ClassicWidgetPreview type={t} />}
            label={entry.label}
            description={entry.description}
            sizeHint={`Suggested ${entry.defaultColSpan}×${entry.defaultRowSpan} · responsive`}
          />
        );
      })}
    </div>
  );
}

export function GenericWidgetPreview({ id }: { id: GenericWidgetType }) {
  const defaults = getGenericWidgetDefaults(id);
  const props = { config: defaults.config, editPreview: true as const };
  switch (id) {
    case "time":
      return <TimeWidget {...props} />;
    case "calendar":
      return <CalendarWidget editPreview />;
    case "weather":
      return <WeatherWidget {...props} />;
    case "system_info":
      return <SystemInfoWidget editPreview />;
    case "activity_log":
      return <ActivityLogWidget {...props} />;
    case "network_status":
      return <NetworkStatusWidget editPreview />;
    case "speed_test":
      return <SpeedTestWidget {...props} />;
    default:
      return null;
  }
}

export function WidgetCatalogPicker({
  mode,
  selectedLibraryId,
  selectedGenericType,
  onPickLibrary,
  onPickGeneric,
  compact = false,
  libraryFilter = "all",
  hasSensors = true,
  hasRelays = true,
}: {
  mode: "library" | "generic";
  selectedLibraryId?: WidgetLibraryId;
  selectedGenericType?: GenericWidgetType;
  onPickLibrary?: (id: WidgetLibraryId) => void;
  onPickGeneric?: (id: GenericWidgetType) => void;
  compact?: boolean;
  libraryFilter?: "all" | "sensor" | "relay";
  hasSensors?: boolean;
  hasRelays?: boolean;
}) {
  if (mode === "generic") {
    return (
      <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "lg:grid-cols-2")}>
        {GENERIC_WIDGET_LIBRARY.map((entry) => {
          const defaults = getGenericWidgetDefaults(entry.id);
          const active = selectedGenericType === entry.id;
          return (
            <TemplateCard
              key={entry.id}
              active={active}
              onClick={() => onPickGeneric?.(entry.id)}
              preview={<GenericWidgetPreview id={entry.id} />}
              label={entry.label}
              description={entry.description}
              sizeHint={`Default ${defaults.colSpan}×${defaults.rowSpan} cells`}
            />
          );
        })}
      </div>
    );
  }

  const opts = { hasSensors, hasRelays };

  if (libraryFilter === "relay" || libraryFilter === "sensor") {
    const items = catalogForBinding(libraryFilter, opts);
    return (
      <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "lg:grid-cols-2")}>
        {items.map((entry) => (
          <TemplateCard
            key={entry.id}
            active={selectedLibraryId === entry.id}
            onClick={() => onPickLibrary?.(entry.id)}
            preview={<LibraryTemplatePreview id={entry.id} />}
            label={entry.label}
            description={entry.description}
            sizeHint="Responsive · fits 1×1, grows with cell size"
          />
        ))}
      </div>
    );
  }

  const categories: WidgetLibraryCategory[] = ["switches", "gauges", "statistics", "data"];

  const labels: Record<WidgetLibraryCategory, string> = {
    switches: "Switches & relays",
    gauges: "Gauges",
    statistics: "Statistics cards",
    data: "Charts & history",
  };

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        let items = catalogByCategory(category);
        if (category === "switches" && !hasRelays) return null;
        if (category !== "switches" && !hasSensors) return null;
        items = items.filter((e) => {
          const relayOk =
            !e.bindings.includes("relay") &&
            !e.bindings.includes("device_relays")
              ? true
              : hasRelays;
          const sensorOk =
            !e.bindings.includes("sensor") && !e.bindings.includes("sensor_history")
              ? true
              : hasSensors;
          return relayOk && sensorOk;
        });
        if (items.length === 0) return null;
        return (
          <div key={category}>
            <p className="mb-2 text-xs font-medium text-muted-foreground">{labels[category]}</p>
            <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "lg:grid-cols-2")}>
              {items.map((entry) => (
                <TemplateCard
                  key={entry.id}
                  active={selectedLibraryId === entry.id}
                  onClick={() => onPickLibrary?.(entry.id)}
                  preview={<LibraryTemplatePreview id={entry.id} />}
                  label={entry.label}
                  description={entry.description}
                  sizeHint={
                    entry.bindings.includes("relay") || entry.bindings.includes("device_relays")
                      ? "Responsive · fits 1×1, grows with cell size"
                      : `${entry.defaultColSpan}×${entry.defaultRowSpan} cells suggested`
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
