"use client";

import { useEffect, useState } from "react";
import type { WidgetConfig } from "@/types/dashboard";
import type { WidgetLibraryId } from "@/library/widget-catalog";
import {
  bindingKindForLibrary,
  getCatalogEntry,
  relaysLayoutForLibraryId,
} from "@/library/widget-catalog";
import {
  formatSensorValue,
  historyToChartPoints,
  historyTrendText,
  humidityProgress,
  liveStatusText,
  type LiveReading,
} from "@/lib/library-bindings";
import { iconForSensorType } from "@/lib/library-icons";
import {
  SWITCH_LIBRARY_RENDERERS,
  SwitchDevicePanelPreview,
  type SwitchWidgetProps,
} from "@/library/widgets/switches/SwitchWidgets";
import { DeviceRelaysWidget } from "@/components/DeviceRelaysWidget";
import GaussianStatCard from "@/library/widgets/statistics/GaussianStatCard";
import IconColorWidget from "@/library/widgets/statistics/IconColorWidget";
import ProgressStatCard from "@/library/widgets/data/ProgressStatCard";
import RadialStatCard from "@/library/widgets/data/RadialStatCard";
import AreaStatsCard from "@/library/widgets/data/AreaStatsCard";
import LineHistoryCard from "@/library/widgets/data/WebsiteVisitorsCard";
import { SemicircleNeedleGauge } from "@/library/widgets/gauges/SemicircleNeedleGauge";
import { RingGauge, SolidArcGauge } from "@/library/widgets/gauges/RingGauge";
import { gaugeRangeForSensor } from "@/library/widgets/gauges/gauge-utils";
import { resolveDeviceRelayIds } from "@/lib/relay-order";

interface SensorMeta {
  id: string;
  name: string;
  unit: string | null;
  sensorType: string;
  deviceName: string;
  roomName: string | null;
}

interface RelayMeta {
  id: string;
  name: string;
  deviceId: string;
  deviceName: string;
  roomName: string | null;
  lastState: string | null;
  createdAt?: string;
}

export function LibraryWidget({
  libraryId,
  title,
  config,
  sensors,
  relays,
  editPreview = false,
}: {
  libraryId: WidgetLibraryId;
  title?: string | null;
  config: WidgetConfig;
  sensors: SensorMeta[];
  relays: RelayMeta[];
  editPreview?: boolean;
}) {
  const entry = getCatalogEntry(libraryId);
  const binding = bindingKindForLibrary(libraryId, config);
  const sensor = config.sensorId
    ? sensors.find((s) => s.id === config.sensorId)
    : undefined;
  const relay = config.relayId ? relays.find((r) => r.id === config.relayId) : undefined;

  const [reading, setReading] = useState<LiveReading | null>(null);
  const [history, setHistory] = useState<{ time: string; value: number }[]>([]);

  const needsHistory = binding === "sensor_history";
  const needsSensorPoll = binding === "sensor" || binding === "sensor_history";

  useEffect(() => {
    if (editPreview || !needsSensorPoll || !config.sensorId) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/readings/latest");
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data) || cancelled) return;
        const row = data.find((r: LiveReading) => r.sensorId === config.sensorId);
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
  }, [editPreview, needsSensorPoll, config.sensorId]);

  useEffect(() => {
    if (editPreview || !needsHistory || !config.sensorId) return;

    let cancelled = false;

    async function loadHistory() {
      try {
        const res = await fetch(`/api/readings?sensorId=${config.sensorId}&hours=24`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.history)) {
          setHistory(data.history);
          if (data.latest !== undefined) {
            setReading((prev) => ({
              sensorId: config.sensorId!,
              latest: data.latest,
              updatedAt: data.updatedAt ?? prev?.updatedAt ?? null,
              isLive: prev?.isLive,
              unit: data.unit,
            }));
          }
        }
      } catch {
        /* ignore */
      }
    }

    loadHistory();
    const id = setInterval(loadHistory, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [editPreview, needsHistory, config.sensorId]);

  if (!entry) {
    return <p className="text-sm text-muted-foreground">Unknown library widget</p>;
  }

  if (editPreview) {
    const bindLabel =
      sensor?.name || relay?.name || (binding === "sensor_history" ? "Sensor history" : "Unbound");
    const SwitchPreview = SWITCH_LIBRARY_RENDERERS[libraryId];
    if (SwitchPreview && binding === "relay") {
      return (
        <SwitchPreview
          relayId="preview"
          name={title || relay?.name || "Relay"}
          subtitle={relay?.roomName || relay?.deviceName}
          editPreview
        />
      );
    }
    if (binding === "device_relays") {
      const layout = relaysLayoutForLibraryId(libraryId);
      return <SwitchDevicePanelPreview layout={layout} />;
    }
    return (
      <div className="h-full overflow-hidden rounded-lg border border-border/50 bg-black/20 p-3">
        <p className="truncate text-sm font-semibold text-foreground">{title || entry.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{entry.label}</p>
        <p className="mt-2 text-[10px] text-muted-foreground">Bound to: {bindLabel}</p>
      </div>
    );
  }

  if (binding === "device_relays" && config.deviceId) {
    const relayIds = resolveDeviceRelayIds(relays, config.deviceId, config.relayIds);
    const deviceName =
      relays.find((r) => r.deviceId === config.deviceId)?.deviceName || title || "Device";
    const roomName = relays.find((r) => r.deviceId === config.deviceId)?.roomName ?? null;
    const layout =
      config.relaysLayout || relaysLayoutForLibraryId(libraryId);

    return (
      <DeviceRelaysWidget
        title={title || undefined}
        deviceName={deviceName}
        roomName={roomName}
        relayIds={relayIds}
        relays={relays}
        layout={layout}
        titleIcon={config.appearance?.titleIcon}
        titleMode={config.appearance?.titleMode}
        sensorIds={config.sensorIds ?? []}
        sensors={sensors}
      />
    );
  }

  if (binding === "relay" && relay) {
    const switchProps: SwitchWidgetProps = {
      relayId: relay.id,
      name: title || relay.name,
      subtitle: relay.roomName || relay.deviceName,
      initialState: relay.lastState,
    };

    const SwitchComponent = SWITCH_LIBRARY_RENDERERS[libraryId];
    if (SwitchComponent) {
      return <SwitchComponent {...switchProps} />;
    }
  }

  if ((binding === "sensor" || binding === "sensor_history") && sensor) {
    const displayTitle = title || sensor.name;
    const valueStr = formatSensorValue(reading?.latest ?? null, sensor.unit);
    const subtitle = sensor.roomName || sensor.deviceName;
    const status = liveStatusText(reading ?? undefined);
    const Icon = iconForSensorType(sensor.sensorType);
    const chartData = historyToChartPoints(history);
    const trend = historyTrendText(chartData);
    const range = gaugeRangeForSensor(
      sensor.sensorType,
      sensor.unit,
      reading?.latest ?? null
    );
    const numericValue = reading?.latest ?? null;

    switch (libraryId) {
      case "gauge-semicircle":
        return (
          <SemicircleNeedleGauge
            title={displayTitle}
            subtitle={subtitle}
            value={numericValue}
            min={range.min}
            max={range.max}
            unit={sensor.unit}
            zones={range.zones}
            statusText={status}
            icon={Icon}
          />
        );
      case "gauge-ring":
        return (
          <RingGauge
            title={displayTitle}
            subtitle={subtitle}
            value={numericValue}
            min={range.min}
            max={range.max}
            unit={sensor.unit}
            zones={range.zones}
            statusText={status}
            icon={Icon}
          />
        );
      case "gauge-solid-arc":
        return (
          <SolidArcGauge
            title={displayTitle}
            subtitle={subtitle}
            value={numericValue}
            min={range.min}
            max={range.max}
            unit={sensor.unit}
            zones={range.zones}
            statusText={status}
            icon={Icon}
          />
        );
      case "gaussian-stat":
        return (
          <GaussianStatCard
            title={displayTitle}
            subtitle={subtitle}
            value={valueStr}
            trendText={status}
            icon={Icon}
            showMenu={false}
          />
        );
      case "icon-stat":
        return <IconColorWidget title={displayTitle} value={valueStr} icon={Icon} />;
      case "progress-stat":
        return (
          <ProgressStatCard
            title={displayTitle}
            value={valueStr}
            progress={humidityProgress(reading?.latest ?? null)}
            badgeText={status}
            icon={Icon}
          />
        );
      case "radial-stat": {
        const radialValue =
          reading?.latest !== null && reading?.latest !== undefined
            ? Math.round(reading.latest)
            : 0;
        return (
          <RadialStatCard
            title={displayTitle}
            subtitle={subtitle}
            value={radialValue}
            label={sensor.unit || sensor.sensorType}
            trend={status}
          />
        );
      }
      case "area-stats":
        return (
          <AreaStatsCard
            title={displayTitle}
            value={valueStr}
            subtitle={trend || status}
            data={chartData.length > 0 ? chartData : [{ value: 0 }]}
          />
        );
      case "line-history":
        return (
          <LineHistoryCard
            title={displayTitle}
            value={valueStr}
            subtitle={trend || status}
            data={chartData.length > 0 ? chartData : [{ value: 0 }]}
          />
        );
      default:
        break;
    }
  }

  return (
    <p className="text-sm text-muted-foreground">
      Configure a {entry.bindings.join(" or ")} binding for this template.
    </p>
  );
}
