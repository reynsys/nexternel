"use client";

import { useEffect, useState } from "react";
import type { DashboardWidgetDto, WidgetElementId } from "@/types/dashboard";
import {
  resolveWidgetElements,
  resolveWidgetAppearance,
  WIDGET_TYPE_LABELS,
  isGenericWidgetType,
} from "@/types/dashboard";
import { SensorCard } from "@/components/SensorCard";
import { DeviceSensorsWidget } from "@/components/DeviceSensorsWidget";
import { DeviceRelaysWidget } from "@/components/DeviceRelaysWidget";
import { RelayCard } from "@/components/RelayCard";
import { LibraryWidget } from "@/components/dashboard/LibraryWidget";
import {
  ActivityLogWidget,
  CalendarWidget,
  NetworkStatusWidget,
  SpeedTestWidget,
  SystemInfoWidget,
  TimeWidget,
  WeatherWidget,
} from "@/components/dashboard/widgets/GenericWidgets";
import { WidgetTitleBar } from "@/components/dashboard/WidgetTitleBar";
import { getCatalogEntry } from "@/library/widget-catalog";
import { resolveDeviceRelayIds } from "@/lib/relay-order";
import { WidgetFitRoot } from "@/components/dashboard/WidgetFitContainer";
import { resolveWidgetPlatform } from "@/widget-platform/resolve/instance";
import { WidgetPlatformRenderer } from "@/widget-platform/renderer/WidgetPlatformRenderer";
import { cn } from "@/lib/utils";

interface SensorMeta {
  id: string;
  name: string;
  unit: string | null;
  sensorType: string;
  deviceId: string;
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

interface DeviceMeta {
  id: string;
  name: string;
  roomName: string | null;
  isOnline: boolean;
  lastSeenAt?: string | null;
}

function widgetLabel(widget: DashboardWidgetDto, sensors: SensorMeta[], relays: RelayMeta[]) {
  if (widget.title) return widget.title;
  if (widget.type === "sensor") {
    return sensors.find((s) => s.id === widget.config.sensorId)?.name || "Sensor";
  }
  if (widget.type === "relay") {
    return relays.find((r) => r.id === widget.config.relayId)?.name || "Relay";
  }
  if (widget.type === "library") {
    const entry = getCatalogEntry(widget.config.libraryId);
    return widget.title || entry?.label || "Library widget";
  }
  if (widget.type === "device_sensors") {
    const deviceId = widget.config.deviceId;
    const match = sensors.find((s) => s.deviceId === deviceId);
    return widget.title || match?.deviceName || "Device sensors";
  }
  if (widget.type === "device_relays") {
    const deviceId = widget.config.deviceId;
    const match = relays.find((r) => r.deviceId === deviceId);
    return widget.title || match?.deviceName || "Device switches";
  }
  return WIDGET_TYPE_LABELS[widget.type];
}

export function RoomSensorsWidget({
  title,
  sensorIds,
  sensors,
  elements,
  editPreview,
}: {
  title: string;
  sensorIds: string[];
  sensors: SensorMeta[];
  elements?: WidgetElementId[];
  editPreview?: boolean;
}) {
  const items = sensorIds
    .map((id) => sensors.find((s) => s.id === id))
    .filter(Boolean) as SensorMeta[];

  if (editPreview) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border/50 bg-black/20 p-3">
        {title ? <p className="mb-2 truncate text-sm font-semibold">{title}</p> : null}
        <p className="text-xs text-muted-foreground">
          {items.length > 0
            ? items.map((s) => s.name).join(" · ")
            : "No sensors in this widget"}
        </p>
        <p className="mt-2 text-[10px] text-muted-foreground">
          {items.length} sensor card{items.length === 1 ? "" : "s"} — view mode shows full readings
        </p>
      </div>
    );
  }

  return (
    <div className="card flex h-full min-h-0 flex-col overflow-hidden text-left">
      {title ? (
        <WidgetTitleBar title={title} className="px-0" />
      ) : null}
      <div className="min-h-0 w-full flex-1 overflow-hidden">
        <div className="grid h-full gap-1 sm:grid-cols-2">
          {items.map((s) => (
            <SensorCard
              key={s.id}
              sensorId={s.id}
              name={s.name}
              unit={s.unit}
              sensorType={s.sensorType}
              deviceName={s.deviceName}
              roomName={s.roomName}
              elements={elements}
            />
          ))}
        </div>
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">No sensors selected for this widget.</p>
        )}
      </div>
    </div>
  );
}

export function DeviceStatusWidget({
  title,
  devices: initialDevices,
  rowSpan = 1,
  editPreview,
}: {
  title: string;
  devices: DeviceMeta[];
  rowSpan?: number;
  editPreview?: boolean;
}) {
  const [liveDevices, setLiveDevices] = useState<DeviceMeta[]>(initialDevices);

  useEffect(() => {
    setLiveDevices(initialDevices);
  }, [initialDevices]);

  useEffect(() => {
    if (editPreview) return;

    const load = () => {
      fetch("/api/devices")
        .then((r) => r.json())
        .then((list) => {
          if (!Array.isArray(list)) return;
          const enabled = list.filter(
            (d: { isEnabled?: boolean }) => d.isEnabled !== false
          );
          setLiveDevices(
            enabled.map(
              (d: {
                id: string;
                name: string;
                room?: { name: string } | null;
                isOnline: boolean;
                lastSeenAt?: string | null;
              }) => ({
                id: d.id,
                name: d.name,
                roomName: d.room?.name ?? null,
                isOnline: d.isOnline,
                lastSeenAt: d.lastSeenAt ?? null,
              })
            )
          );
        })
        .catch(() => {});
    };

    load();
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, [editPreview]);

  const onlineCount = liveDevices.filter((d) => d.isOnline).length;
  const compact = rowSpan <= 1 || liveDevices.length > 3;

  if (editPreview) {
    return (
      <div className="h-full overflow-hidden rounded-lg border border-border/50 bg-black/20 p-3">
        <p className="truncate text-sm font-semibold">{title || "Devices"}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {initialDevices.map((d) => d.name).join(" · ") || "No devices"}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">Scrollable list in view mode</p>
      </div>
    );
  }

  return (
    <div className="card flex h-full min-h-0 flex-col overflow-hidden text-left">
      <WidgetTitleBar
        title={title || "Devices"}
        className="px-0"
        trailing={
          liveDevices.length > 0 ? (
            <p className="text-[10px] tabular-nums text-muted-foreground">
              {onlineCount}/{liveDevices.length} online
            </p>
          ) : null
        }
      />

      <ul className="min-h-0 w-full flex-1 space-y-1 overflow-y-auto overscroll-contain">
        {liveDevices.map((d) => (
          <li
            key={d.id}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border",
              compact ? "px-2 py-1" : "px-3 py-2"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                d.isOnline ? "bg-emerald-500" : "bg-muted-foreground/35"
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate font-medium", compact ? "text-sm leading-tight" : "")}>
                {d.name}
              </p>
              <p
                className={cn(
                  "truncate text-muted-foreground",
                  compact ? "text-[10px] leading-tight" : "text-xs"
                )}
              >
                {d.roomName || "Unassigned"}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0",
                d.isOnline ? "badge-online" : "badge-offline",
                compact && "px-1.5 py-0 text-[10px]"
              )}
            >
              {d.isOnline ? "Online" : "Offline"}
            </span>
          </li>
        ))}
        {liveDevices.length === 0 && (
          <li className="px-2 py-3 text-sm text-muted-foreground">No devices registered.</li>
        )}
      </ul>
    </div>
  );
}

export function WidgetContent({
  widget,
  sensors,
  relays,
  devices,
  readings,
  editPreview = false,
}: {
  widget: DashboardWidgetDto;
  sensors: SensorMeta[];
  relays: RelayMeta[];
  devices: DeviceMeta[];
  readings: { sensorId: string; updatedAt: string | null; isLive?: boolean }[];
  editPreview?: boolean;
}) {
  const elements = resolveWidgetElements(widget.type, widget.config?.display);
  const appearance = resolveWidgetAppearance(widget.config);
  const rowSpan = widget.rowSpan;

  const body = (() => {
  switch (widget.type) {
    case "sensor": {
      const s = sensors.find((x) => x.id === widget.config.sensorId);
      if (!s) return <div className="text-sm text-muted-foreground">Sensor not found</div>;
      return (
        <SensorCard
          key={elements.join(",")}
          sensorId={s.id}
          name={widget.title || s.name}
          unit={s.unit}
          sensorType={s.sensorType}
          deviceName={s.deviceName}
          roomName={s.roomName}
          elements={elements}
          appearance={appearance}
          rowSpan={rowSpan}
          editPreview={editPreview}
        />
      );
    }
    case "relay": {
      const r = relays.find((x) => x.id === widget.config.relayId);
      if (!r) return <div className="text-sm text-muted-foreground">Relay not found</div>;
      if (editPreview) {
        return (
          <div className="h-full rounded-lg border border-border/50 bg-black/20 p-3">
            <p className="truncate text-sm font-semibold">{widget.title || r.name}</p>
            <p className="text-xs text-muted-foreground">{r.deviceName}</p>
          </div>
        );
      }
      return (
        <RelayCard
          relayId={r.id}
          name={widget.title || r.name}
          deviceName={r.deviceName}
          roomName={r.roomName}
          initialState={r.lastState}
          rowSpan={rowSpan}
        />
      );
    }
    case "room_sensors":
      return (
        <RoomSensorsWidget
          title={widget.title || ""}
          sensorIds={widget.config.sensorIds || []}
          sensors={sensors}
          elements={elements}
          editPreview={editPreview}
        />
      );
    case "device_sensors": {
      const deviceId = widget.config.deviceId;
      const deviceSensors = sensors.filter((s) =>
        widget.config.sensorIds?.length
          ? widget.config.sensorIds.includes(s.id)
          : s.deviceId === deviceId
      );
      const deviceName =
        deviceSensors[0]?.deviceName ||
        devices.find((d) => d.id === deviceId)?.name ||
        "Device";
      const roomName =
        deviceSensors[0]?.roomName ||
        devices.find((d) => d.id === deviceId)?.roomName ||
        null;
      const ids =
        widget.config.sensorIds?.length
          ? widget.config.sensorIds
          : deviceSensors.map((s) => s.id);

      if (!deviceId && ids.length === 0) {
        return <div className="text-sm text-muted-foreground">Device not configured</div>;
      }

      return (
        <DeviceSensorsWidget
          title={widget.title || undefined}
          deviceName={deviceName}
          roomName={roomName}
          sensorIds={ids}
          sensors={sensors}
          elements={elements}
          appearance={appearance}
          rowSpan={rowSpan}
          editPreview={editPreview}
        />
      );
    }
    case "device_relays": {
      const deviceId = widget.config.deviceId;
      const ids = resolveDeviceRelayIds(relays, deviceId, widget.config.relayIds);
      const deviceRelays = ids
        .map((id) => relays.find((r) => r.id === id))
        .filter(Boolean) as RelayMeta[];
      const deviceName =
        deviceRelays[0]?.deviceName ||
        devices.find((d) => d.id === deviceId)?.name ||
        "Device";
      const roomName =
        deviceRelays[0]?.roomName ||
        devices.find((d) => d.id === deviceId)?.roomName ||
        null;

      if (!deviceId && ids.length === 0) {
        return <div className="text-sm text-muted-foreground">Device not configured</div>;
      }

      return (
        <DeviceRelaysWidget
          title={widget.title || undefined}
          deviceName={deviceName}
          roomName={roomName}
          relayIds={ids}
          relays={relays}
          layout={
            widget.config.relaysLayout ||
            (appearance?.readingsLayout === "grid-2" || appearance?.readingsLayout === "grid-3"
              ? "grid-2"
              : "list")
          }
          titleIcon={appearance?.titleIcon}
          titleMode={appearance?.titleMode}
          editPreview={editPreview}
          sensorIds={widget.config.sensorIds ?? []}
          sensors={sensors}
        />
      );
    }
    case "device_status":
      return (
        <DeviceStatusWidget
          title={widget.title || "Devices"}
          devices={devices}
          rowSpan={rowSpan}
          editPreview={editPreview}
        />
      );
    case "time":
      return (
        <TimeWidget
          config={widget.config}
          appearance={appearance}
          title={widget.title}
          rowSpan={rowSpan}
          editPreview={editPreview}
        />
      );
    case "calendar":
      return (
        <CalendarWidget
          appearance={appearance}
          title={widget.title}
          colSpan={widget.colSpan}
          rowSpan={rowSpan}
          editPreview={editPreview}
        />
      );
    case "weather":
      return (
        <WeatherWidget
          config={widget.config}
          appearance={appearance}
          title={widget.title}
          rowSpan={rowSpan}
          editPreview={editPreview}
        />
      );
    case "system_info":
      return (
        <SystemInfoWidget
          appearance={appearance}
          title={widget.title}
          rowSpan={rowSpan}
          editPreview={editPreview}
        />
      );
    case "activity_log":
      return (
        <div className="h-full min-h-0 overflow-hidden">
          <ActivityLogWidget
            config={widget.config}
            appearance={appearance}
            title={widget.title}
            editPreview={editPreview}
            className="h-full"
          />
        </div>
      );
    case "network_status":
      return (
        <NetworkStatusWidget
          appearance={appearance}
          title={widget.title}
          rowSpan={rowSpan}
          editPreview={editPreview}
        />
      );
    case "speed_test":
      return (
        <SpeedTestWidget
          config={widget.config}
          appearance={appearance}
          title={widget.title}
          rowSpan={rowSpan}
          colSpan={widget.colSpan}
          editPreview={editPreview}
        />
      );
    case "library": {
      const platformInstance = resolveWidgetPlatform(widget);
      if (platformInstance) {
        return (
          <WidgetPlatformRenderer
            instance={platformInstance}
            title={widget.title}
            sensors={sensors}
            appearance={appearance}
            editPreview={editPreview}
          />
        );
      }
      if (!widget.config.libraryId) {
        return <div className="text-sm text-muted-foreground">Library template not set</div>;
      }
      return (
        <LibraryWidget
          libraryId={widget.config.libraryId}
          title={widget.title}
          config={widget.config}
          sensors={sensors}
          relays={relays}
          editPreview={editPreview}
        />
      );
    }
    default:
      if (isGenericWidgetType(widget.type)) {
        return <div className="text-sm text-muted-foreground">Generic widget not configured</div>;
      }
      return <div className="text-sm text-muted-foreground">Unknown widget type</div>;
  }
  })();

  return <WidgetFitRoot>{body}</WidgetFitRoot>;
}

export { widgetLabel };
