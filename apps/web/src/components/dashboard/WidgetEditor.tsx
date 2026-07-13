"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { DashboardWidgetDto, WidgetType, GenericWidgetType } from "@/types/dashboard";
import {
  WIDGET_TYPE_LABELS,
  CLASSIC_WIDGET_TYPES,
  GENERIC_WIDGET_DEFAULTS,
} from "@/types/dashboard";
import { AREA } from "@/lib/area-labels";
import { listAvailableCells } from "@/lib/grid";
import { cn } from "@/lib/utils";
import {
  type WidgetBindingKind,
  type WidgetLibraryId,
  defaultLibraryId,
  getCatalogEntry,
  primaryBinding,
  relaysLayoutForLibraryId,
} from "@/library/widget-catalog";
import { WidgetCatalogPicker, ClassicWidgetPicker } from "@/components/library/WidgetCatalogPreviews";
import { CLASSIC_WIDGET_LIBRARY } from "@/library/classic-widget-catalog";
import { relaysForDevice, resolveDeviceRelayIds } from "@/lib/relay-order";

interface Catalog {
  sensors: {
    id: string;
    name: string;
    deviceName: string;
    deviceId: string;
    roomId: string | null;
    unit: string | null;
    sensorType: string;
  }[];
  relays: { id: string; name: string; deviceId: string; deviceName?: string; createdAt?: string }[];
  rooms: { id: string; name: string }[];
  devices: { id: string; name: string }[];
}

type EditorMode = "classic" | "library" | "generic";

export function WidgetEditor({
  layoutId,
  columns,
  rows,
  catalog,
  existingWidgets = [],
  initialClassic,
  onCreated,
  onClose,
}: {
  layoutId: string;
  columns: number;
  rows: number;
  catalog: Catalog;
  existingWidgets?: { cell: string; colSpan: number; rowSpan: number }[];
  initialClassic?: { type: WidgetType; deviceId?: string; relayId?: string };
  onCreated: (w: DashboardWidgetDto) => void;
  onClose: () => void;
}) {
  const hasSensors = catalog.sensors.length > 0;
  const hasRelays = catalog.relays.length > 0;

  const [mode, setMode] = useState<EditorMode>(
    initialClassic ? "classic" : hasRelays ? "library" : "library"
  );
  const [type, setType] = useState<WidgetType>(
    initialClassic?.type ?? (hasRelays && !hasSensors ? "device_relays" : "sensor")
  );
  const [genericType, setGenericType] = useState<GenericWidgetType>("time");
  const [libraryId, setLibraryId] = useState<WidgetLibraryId>(
    defaultLibraryId({ hasSensors, hasRelays })
  );
  const [libraryFilter, setLibraryFilter] = useState<"all" | "sensor" | "relay">(
    hasRelays && !hasSensors ? "relay" : hasRelays ? "all" : "sensor"
  );
  const [title, setTitle] = useState("");
  const [colSpan, setColSpan] = useState(1);
  const [rowSpan, setRowSpan] = useState(1);
  const [cell, setCell] = useState("A1");
  const [sensorId, setSensorId] = useState(catalog.sensors[0]?.id || "");
  const [relayId, setRelayId] = useState(
    initialClassic?.relayId || catalog.relays[0]?.id || ""
  );
  const [roomId, setRoomId] = useState(catalog.rooms[0]?.id || "");
  const [deviceId, setDeviceId] = useState(
    initialClassic?.deviceId ||
      catalog.devices.find((d) => catalog.relays.some((r) => r.deviceId === d.id))?.id ||
      catalog.devices[0]?.id ||
      catalog.sensors[0]?.deviceId ||
      ""
  );

  const relaysOnDevice = useCallback(
    (id: string) => relaysForDevice(catalog.relays, id),
    [catalog.relays]
  );

  const sensorsForDevice = useCallback(
    (id: string) => catalog.sensors.filter((s) => s.deviceId === id),
    [catalog.sensors]
  );

  const [panelSensorIds, setPanelSensorIds] = useState<string[]>([]);

  const devicesWithRelays = useMemo(
    () =>
      catalog.devices.filter((d) => catalog.relays.some((r) => r.deviceId === d.id)),
    [catalog.devices, catalog.relays]
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const availableCells = useMemo(
    () => listAvailableCells(colSpan, rowSpan, columns, rows, existingWidgets),
    [colSpan, rowSpan, columns, rows, existingWidgets]
  );

  useEffect(() => {
    if (availableCells.length === 0) return;
    if (!availableCells.includes(cell)) {
      setCell(availableCells[0]);
    }
  }, [availableCells, cell]);

  useEffect(() => {
    const valid = new Set(sensorsForDevice(deviceId).map((s) => s.id));
    setPanelSensorIds((prev) => prev.filter((id) => valid.has(id)));
  }, [deviceId, sensorsForDevice]);

  function togglePanelSensor(sensorIdToToggle: string) {
    setPanelSensorIds((prev) =>
      prev.includes(sensorIdToToggle)
        ? prev.filter((id) => id !== sensorIdToToggle)
        : [...prev, sensorIdToToggle]
    );
  }

  const libraryEntry = getCatalogEntry(libraryId);
  const libraryBinding: WidgetBindingKind | undefined = libraryEntry
    ? libraryEntry.bindings.includes("device_relays")
      ? "device_relays"
      : libraryFilter === "relay" && libraryEntry.bindings.includes("relay")
        ? "relay"
        : libraryEntry.bindings.includes("relay") &&
            !libraryEntry.bindings.includes("sensor") &&
            !libraryEntry.bindings.includes("sensor_history")
          ? "relay"
          : primaryBinding(libraryEntry.bindings)
    : undefined;

  const classicTypes = CLASSIC_WIDGET_TYPES.filter((t) => {
    if (t === "sensor" || t === "room_sensors" || t === "device_sensors") return hasSensors;
    if (t === "relay" || t === "device_relays") return hasRelays;
    return true;
  });

  function applyLibraryDefaults(id: WidgetLibraryId) {
    const entry = getCatalogEntry(id);
    if (!entry) return;
    setLibraryId(id);
    setColSpan(entry.defaultColSpan);
    setRowSpan(entry.defaultRowSpan);
  }

  function pickClassic(t: WidgetType) {
    setType(t);
    const entry = CLASSIC_WIDGET_LIBRARY.find((e) => e.id === t);
    if (entry) {
      setColSpan(entry.defaultColSpan);
      setRowSpan(entry.defaultRowSpan);
    }
  }

  function pickDeviceForRelays(id: string) {
    setDeviceId(id);
  }

  function pickGeneric(gt: GenericWidgetType) {
    setGenericType(gt);
    const d = GENERIC_WIDGET_DEFAULTS[gt];
    if (d) {
      setColSpan(d.colSpan);
      setRowSpan(d.rowSpan);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const config: Record<string, unknown> = {};
    let postColSpan = colSpan;
    let postRowSpan = rowSpan;

    if (mode === "generic") {
      const defaults = GENERIC_WIDGET_DEFAULTS[genericType];
      Object.assign(config, defaults.config);
      postColSpan = defaults.colSpan;
      postRowSpan = defaults.rowSpan;
    } else if (mode === "classic") {
      if (type === "sensor") config.sensorId = sensorId;
      if (type === "relay") config.relayId = relayId;
      if (type === "room_sensors") {
        config.roomId = roomId;
        config.sensorIds = catalog.sensors.filter((s) => s.roomId === roomId).map((s) => s.id);
      }
      if (type === "device_sensors") {
        if (!deviceId) {
          setError("Select a device for this widget");
          setSaving(false);
          return;
        }
        config.deviceId = deviceId;
        config.sensorIds = catalog.sensors
          .filter((s) => s.deviceId === deviceId)
          .map((s) => s.id);
        if ((config.sensorIds as string[]).length === 0) {
          setError("This device has no enabled sensors");
          setSaving(false);
          return;
        }
      }
      if (type === "device_relays") {
        if (!deviceId) {
          setError("Select a device for this widget");
          setSaving(false);
          return;
        }
        const ids = resolveDeviceRelayIds(catalog.relays, deviceId);
        if (ids.length === 0) {
          setError("This device has no enabled relays");
          setSaving(false);
          return;
        }
        config.deviceId = deviceId;
        config.relayIds = ids;
        config.relaysLayout = "list";
        if (panelSensorIds.length > 0) config.sensorIds = panelSensorIds;
      }
    } else {
      config.libraryId = libraryId;
      if (libraryBinding === "device_relays") {
        if (!deviceId) {
          setError("Select a device for this relay panel");
          setSaving(false);
          return;
        }
        const ids = resolveDeviceRelayIds(catalog.relays, deviceId);
        if (ids.length === 0) {
          setError("This device has no enabled relays");
          setSaving(false);
          return;
        }
        config.deviceId = deviceId;
        config.relayIds = ids;
        config.relaysLayout = relaysLayoutForLibraryId(libraryId);
        if (panelSensorIds.length > 0) config.sensorIds = panelSensorIds;
      } else if (libraryBinding === "relay") {
        if (!relayId) {
          setError("Select a relay for this template");
          setSaving(false);
          return;
        }
        config.relayId = relayId;
      } else {
        if (!sensorId) {
          setError("Select a sensor for this template");
          setSaving(false);
          return;
        }
        config.sensorId = sensorId;
      }
    }

    const widgetType: WidgetType =
      mode === "library" ? "library" : mode === "generic" ? genericType : type;

    const res = await fetch("/api/dashboard/widgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        layoutId,
        type: widgetType,
        title: title || undefined,
        cell: availableCells.includes(cell) ? cell : availableCells[0] || "A1",
        colSpan: postColSpan,
        rowSpan: postRowSpan,
        config,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create widget");
      return;
    }

    const widget = await res.json();
    onCreated(widget);
    onClose();
  }

  const showDevicePanelConfig =
    (mode === "classic" && type === "device_relays") ||
    (mode === "library" && libraryBinding === "device_relays");

  const devicePanelSensors = sensorsForDevice(deviceId);

  return (
    <div className="card mb-6 border-primary/40">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-foreground">Add widget</h2>
        <button type="button" className="btn-secondary text-xs" onClick={onClose}>
          Cancel
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-lg border px-3 py-1.5 text-xs ${
            mode === "library" ? "border-primary bg-primary/10 text-foreground" : ""
          }`}
          onClick={() => setMode("library")}
        >
          Library templates
        </button>
        <button
          type="button"
          className={`rounded-lg border px-3 py-1.5 text-xs ${
            mode === "generic" ? "border-primary bg-primary/10 text-foreground" : ""
          }`}
          onClick={() => {
            setMode("generic");
            pickGeneric("time");
          }}
        >
          Utility widgets
        </button>
        <button
          type="button"
          className={`rounded-lg border px-3 py-1.5 text-xs ${
            mode === "classic" ? "border-primary bg-primary/10 text-foreground" : ""
          }`}
          onClick={() => {
            setMode("classic");
            if (hasRelays && !classicTypes.includes(type)) pickClassic("device_relays");
          }}
        >
          Classic widgets
        </button>
      </div>

      {mode === "library" && hasRelays && (
        <p className="mb-2 text-xs text-muted-foreground">
          Pick a template below. Switch widgets fit a <strong className="text-foreground">1×1</strong>{" "}
          cell and scale up when you give them more space.
        </p>
      )}

      {mode === "library" && (
        <div className="sticky top-0 z-10 -mx-1 mb-3 flex flex-wrap gap-2 border-b border-border/70 bg-card/95 px-1 py-2 backdrop-blur-sm">
          {hasRelays && (
            <button
              type="button"
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                libraryFilter === "relay"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/30 hover:border-primary/50"
              )}
              onClick={() => {
                setLibraryFilter("relay");
                const current = getCatalogEntry(libraryId);
                if (
                  !current?.bindings.includes("relay") &&
                  !current?.bindings.includes("device_relays")
                ) {
                  applyLibraryDefaults("switch-device-list");
                }
              }}
            >
              Switches & relays
            </button>
          )}
          {hasSensors && (
            <button
              type="button"
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                libraryFilter === "sensor"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/30 hover:border-primary/50"
              )}
              onClick={() => setLibraryFilter("sensor")}
            >
              Sensors & charts
            </button>
          )}
          {hasSensors && hasRelays && (
            <button
              type="button"
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                libraryFilter === "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/30 hover:border-primary/50"
              )}
              onClick={() => setLibraryFilter("all")}
            >
              All templates
            </button>
          )}
        </div>
      )}

      {(mode === "library" || mode === "generic") && (
        <div className="mb-4 max-h-[28rem] overflow-y-auto rounded-lg border bg-muted/10 p-3">
          <WidgetCatalogPicker
            mode={mode}
            compact
            selectedLibraryId={libraryId}
            selectedGenericType={genericType}
            onPickLibrary={applyLibraryDefaults}
            onPickGeneric={pickGeneric}
            libraryFilter={libraryFilter}
            hasSensors={hasSensors}
            hasRelays={hasRelays}
          />
        </div>
      )}

      {mode === "classic" && (
        <div className="mb-4 max-h-[28rem] overflow-y-auto rounded-lg border bg-muted/10 p-3">
          <p className="mb-3 text-xs text-muted-foreground">
            Built-in widget types with live previews. Click a card to select, then configure below.
          </p>
          <ClassicWidgetPicker types={classicTypes} selected={type} onPick={pickClassic} />
        </div>
      )}

      <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
        {mode === "classic" ? (
          <div className="sm:col-span-2">
            <p className="text-sm text-muted-foreground">
              Selected:{" "}
              <strong className="text-foreground">
                {CLASSIC_WIDGET_LIBRARY.find((e) => e.id === type)?.label ?? WIDGET_TYPE_LABELS[type]}
              </strong>
            </p>
          </div>
        ) : mode === "library" && libraryEntry ? (
          <div className="sm:col-span-2">
            <p className="text-sm text-muted-foreground">
              Selected: <strong className="text-foreground">{libraryEntry.label}</strong> —{" "}
              {libraryEntry.description}
            </p>
          </div>
        ) : mode === "generic" ? (
          <div className="sm:col-span-2">
            <p className="text-sm text-muted-foreground">
              Selected:{" "}
              <strong className="text-foreground">{WIDGET_TYPE_LABELS[genericType]}</strong>
            </p>
          </div>
        ) : null}

        <div>
          <label className="label">Title (optional)</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Living Room"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Grid cell</label>
          {availableCells.length === 0 ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              No free cell fits this size — reduce W/H or add rows/columns.
            </p>
          ) : (
            <>
              <select
                className="input"
                value={availableCells.includes(cell) ? cell : availableCells[0]}
                onChange={(e) => setCell(e.target.value)}
              >
                {availableCells.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Top-left corner of the widget. Overlapping widgets move to the next free cells.
              </p>
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:col-span-2">
          <div>
            <label className="label">Width (columns)</label>
            <input
              type="number"
              min={1}
              max={columns}
              className="input"
              value={colSpan}
              onChange={(e) => setColSpan(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Height (rows)</label>
            <input
              type="number"
              min={1}
              max={rows}
              className="input"
              value={rowSpan}
              onChange={(e) => setRowSpan(Number(e.target.value))}
            />
          </div>
        </div>

        {mode === "classic" && type === "sensor" && (
          <div className="sm:col-span-2">
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

        {mode === "classic" && type === "relay" && (
          <div className="sm:col-span-2">
            <label className="label">Relay / switch</label>
            {catalog.relays.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No relays registered — add a device with relays in Admin → Devices first.
              </p>
            ) : (
              <select className="input" value={relayId} onChange={(e) => setRelayId(e.target.value)}>
                {catalog.relays.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.deviceName ? `${r.name} (${r.deviceName})` : r.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {mode === "classic" && type === "room_sensors" && (
          <div className="sm:col-span-2">
            <label className="label">{AREA.singular}</label>
            <select className="input" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              {catalog.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === "classic" && type === "device_relays" && (
          <div className="sm:col-span-2">
            <label className="label">Device (all relays)</label>
            <select
              className="input"
              value={deviceId}
              onChange={(e) => pickDeviceForRelays(e.target.value)}
            >
              {devicesWithRelays.map((d) => {
                const count = relaysOnDevice(d.id).length;
                return (
                  <option key={d.id} value={d.id}>
                    {d.name} ({count} switch{count === 1 ? "" : "es"})
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Includes every enabled relay on this ESP32. Widget fits 1×1 and scrolls — make taller
              to see all switches without scrolling.
            </p>
          </div>
        )}

        {mode === "classic" && type === "device_sensors" && (
          <div className="sm:col-span-2">
            <label className="label">Device</label>
            <select
              className="input"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
            >
              {catalog.devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              One widget for every reading from this device (e.g. temperature and humidity together).
            </p>
          </div>
        )}

        {mode === "library" && libraryBinding === "device_relays" && (
          <div className="sm:col-span-2">
            <label className="label">Device (all relays)</label>
            <select
              className="input"
              value={deviceId}
              onChange={(e) => pickDeviceForRelays(e.target.value)}
            >
              {devicesWithRelays.map((d) => {
                const count = relaysOnDevice(d.id).length;
                return (
                  <option key={d.id} value={d.id}>
                    {d.name} ({count} switch{count === 1 ? "" : "es"})
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              {relaysOnDevice(deviceId).length} relay
              {relaysOnDevice(deviceId).length === 1 ? "" : "s"} will appear in this widget.
            </p>
          </div>
        )}

        {mode === "library" && libraryBinding === "relay" && (
          <div className="sm:col-span-2">
            <label className="label">Relay / switch</label>
            {catalog.relays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No relays registered yet.</p>
            ) : (
              <select className="input" value={relayId} onChange={(e) => setRelayId(e.target.value)}>
                {catalog.relays.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.deviceName ? `${r.name} (${r.deviceName})` : r.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {showDevicePanelConfig && devicePanelSensors.length > 0 && (
          <div className="sm:col-span-2">
            <label className="label">Include readings (optional)</label>
            <p className="mb-2 text-xs text-muted-foreground">
              Show live sensor values above the switches — pick one or more from this device.
            </p>
            <div className="flex flex-wrap gap-3">
              {devicePanelSensors.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm">
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

        {showDevicePanelConfig && devicePanelSensors.length === 0 && hasSensors && (
          <p className="text-xs text-muted-foreground sm:col-span-2">
            This device has no sensors — only relays will appear in the panel.
          </p>
        )}

        {mode === "library" && (libraryBinding === "sensor" || libraryBinding === "sensor_history") && (
          <div className="sm:col-span-2">
            <label className="label">Sensor</label>
            <select className="input" value={sensorId} onChange={(e) => setSensorId(e.target.value)}>
              {catalog.sensors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.deviceName})
                </option>
              ))}
            </select>
            {libraryBinding === "sensor_history" && (
              <p className="mt-1 text-xs text-muted-foreground">
                Uses InfluxDB history for the last 24 hours.
              </p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}

        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary" disabled={saving || availableCells.length === 0}>
            {saving ? "Creating…" : "Create widget"}
          </button>
        </div>
      </form>
    </div>
  );
}
