"use client";

import { useEffect, useState } from "react";
import type { DashboardWidgetDto, RelaysPanelLayout } from "@/types/dashboard";
import type { DashboardCatalog } from "@/lib/dashboard-catalog";
import { getCatalogEntry, relaysLayoutForLibraryId } from "@/library/widget-catalog";
import { relaysForDevice, resolveDeviceRelayIds } from "@/lib/relay-order";
import { Button } from "@/components/ui/button";

export function WidgetBindingEditor({
  widget,
  catalog,
  onApply,
}: {
  widget: DashboardWidgetDto;
  catalog: DashboardCatalog;
  onApply: (configPatch: Record<string, unknown>) => void;
}) {
  const [relayId, setRelayId] = useState(widget.config.relayId || "");
  const [sensorId, setSensorId] = useState(widget.config.sensorId || "");
  const [deviceId, setDeviceId] = useState(widget.config.deviceId || "");
  const [roomId, setRoomId] = useState(widget.config.roomId || "");
  const [relaysLayout, setRelaysLayout] = useState<RelaysPanelLayout>(() => {
    if (widget.config.relaysLayout) return widget.config.relaysLayout;
    if (widget.type === "library" && widget.config.libraryId) {
      return relaysLayoutForLibraryId(widget.config.libraryId);
    }
    return "list";
  });
  const [panelSensorIds, setPanelSensorIds] = useState<string[]>(widget.config.sensorIds ?? []);

  useEffect(() => {
    setRelayId(widget.config.relayId || "");
    setSensorId(widget.config.sensorId || "");
    setDeviceId(widget.config.deviceId || "");
    setRoomId(widget.config.roomId || "");
    setRelaysLayout(
      widget.config.relaysLayout ||
        (widget.type === "library" && widget.config.libraryId
          ? relaysLayoutForLibraryId(widget.config.libraryId)
          : "list")
    );
    setPanelSensorIds(widget.config.sensorIds ?? []);
  }, [widget.id, widget.config]);

  const libraryEntry =
    widget.type === "library" && widget.config.libraryId
      ? getCatalogEntry(widget.config.libraryId)
      : null;

  const devicesWithRelays = catalog.devices.filter((d) =>
    catalog.relays.some((r) => r.deviceId === d.id)
  );

  function relaysOnDevice(id: string) {
    return relaysForDevice(catalog.relays, id);
  }

  function sensorsForDevice(id: string) {
    return catalog.sensors.filter((s) => s.deviceId === id);
  }

  function togglePanelSensor(id: string) {
    setPanelSensorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function applyBinding() {
    const patch: Record<string, unknown> = { ...(widget.config ?? {}) };

    if (widget.type === "relay" || (widget.type === "library" && relayId)) {
      patch.relayId = relayId;
    }
    if (widget.type === "sensor" || (widget.type === "library" && sensorId && !relayId)) {
      patch.sensorId = sensorId;
    }
    if (widget.type === "device_relays" || (libraryEntry?.bindings.includes("device_relays"))) {
      patch.deviceId = deviceId;
      patch.relayIds = resolveDeviceRelayIds(catalog.relays, deviceId);
      patch.relaysLayout = relaysLayout;
      patch.sensorIds = panelSensorIds;
    }
    if (widget.type === "device_sensors") {
      patch.deviceId = deviceId;
      patch.sensorIds = catalog.sensors.filter((s) => s.deviceId === deviceId).map((s) => s.id);
    }
    if (widget.type === "room_sensors") {
      patch.roomId = roomId;
      patch.sensorIds = catalog.sensors.filter((s) => s.roomId === roomId).map((s) => s.id);
    }

    onApply(patch);
  }

  const showRelay =
    widget.type === "relay" ||
    (widget.type === "library" && libraryEntry?.bindings.includes("relay"));
  const showDeviceRelays =
    widget.type === "device_relays" ||
    (widget.type === "library" && libraryEntry?.bindings.includes("device_relays"));
  const showSensor =
    widget.type === "sensor" ||
    (widget.type === "library" &&
      libraryEntry?.bindings.includes("sensor") &&
      !libraryEntry.bindings.includes("relay"));
  const showDeviceSensors = widget.type === "device_sensors";
  const showRoom = widget.type === "room_sensors";

  if (!showRelay && !showDeviceRelays && !showSensor && !showDeviceSensors && !showRoom) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">Widget source</p>
        <Button type="button" size="sm" className="h-7 text-xs" onClick={applyBinding}>
          Apply
        </Button>
      </div>

      {showRelay && (
        <div>
          <label className="label">Relay / switch</label>
          <select className="input" value={relayId} onChange={(e) => setRelayId(e.target.value)}>
            {catalog.relays.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.deviceName})
              </option>
            ))}
          </select>
        </div>
      )}

      {(showDeviceRelays || showDeviceSensors) && (
        <div>
          <label className="label">Device</label>
          <select className="input" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
            {(showDeviceRelays ? devicesWithRelays : catalog.devices).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {showDeviceRelays
                  ? ` (${relaysOnDevice(d.id).length} switches)`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {showDeviceRelays && deviceId && (
        <div>
          <label className="label">Switches in this widget</label>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {relaysOnDevice(deviceId).map((r) => (
              <li key={r.id} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                {r.name}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            To rename a switch, go to{" "}
            <a href="/admin/devices" className="text-primary underline">
              Admin → Devices
            </a>{" "}
            and use Rename on each relay.
          </p>
        </div>
      )}

      {showDeviceRelays && (
        <div>
          <label className="label">Layout</label>
          <select
            className="input"
            value={relaysLayout}
            onChange={(e) => setRelaysLayout(e.target.value as RelaysPanelLayout)}
          >
            <option value="list">List — pill toggles (best for 1×1)</option>
            <option value="grid-2">Grid — 2 columns (2×2 for 4 switches)</option>
            <option value="vertical">Vertical — ON/OFF buttons per switch</option>
            <option value="horizontal">Horizontal — ON | OFF per switch</option>
            <option value="round">Round — power button per switch</option>
          </select>
        </div>
      )}

      {showDeviceRelays && sensorsForDevice(deviceId).length > 0 && (
        <div>
          <label className="label">Include readings (optional)</label>
          <div className="mt-1 flex flex-wrap gap-3">
            {sensorsForDevice(deviceId).map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={panelSensorIds.includes(s.id)}
                  onChange={() => togglePanelSensor(s.id)}
                />
                {s.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {showSensor && (
        <div>
          <label className="label">Sensor</label>
          <select className="input" value={sensorId} onChange={(e) => setSensorId(e.target.value)}>
            {catalog.sensors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.deviceName})
              </option>
            ))}
          </select>
        </div>
      )}

      {showRoom && (
        <div>
          <label className="label">Area</label>
          <select className="input" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            {catalog.rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
