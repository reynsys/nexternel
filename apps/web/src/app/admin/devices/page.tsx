"use client";

import { useEffect, useState } from "react";
import { AREA } from "@/lib/area-labels";
import { DeviceCard, type DeviceRecord } from "@/components/admin/DeviceCard";
import { esphomeDashboardUrl } from "@/lib/device-utils";
import type { EsphomeImportSuggestion } from "@/lib/esphome-yaml";
import { Button } from "@/components/ui/button";

interface Room {
  id: string;
  name: string;
}

interface EsphomeCatalogEntry {
  fileName: string;
  esphomeName: string;
  mqttTopicPrefix: string;
  registered: boolean;
  sensorCount: number;
  relayCount: number;
  suggestion: EsphomeImportSuggestion | null;
}

function friendlyDeviceName(esphomeName: string): string {
  return esphomeName
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function DevicesAdminPage() {
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [esphomeCatalog, setEsphomeCatalog] = useState<EsphomeCatalogEntry[]>([]);
  const [esphomeDirHint, setEsphomeDirHint] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hostname, setHostname] = useState("localhost");

  const [imported, setImported] = useState<EsphomeImportSuggestion | null>(null);

  const [form, setForm] = useState({
    esphomeFile: "",
    name: "",
    roomId: "",
    mqttTopicPrefix: "",
    esphomeName: "",
    ipAddress: "",
  });

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  async function load() {
    const [devicesRes, roomsRes, catalogRes] = await Promise.all([
      fetch("/api/devices"),
      fetch("/api/rooms"),
      fetch("/api/devices/esphome-catalog"),
    ]);
    if (devicesRes.ok) setDevices(await devicesRes.json());
    if (roomsRes.ok) setRooms(await roomsRes.json());
    if (catalogRes.ok) {
      const data = await catalogRes.json();
      setEsphomeCatalog(data.configs || []);
      setEsphomeDirHint(data.esphomeDirHint || null);
    }
    setLoading(false);
  }

  function handleRelayRenamed(deviceId: string, relayId: string, name: string) {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? {
              ...d,
              relays: d.relays.map((r) => (r.id === relayId ? { ...r, name } : r)),
            }
          : d
      )
    );
  }

  useEffect(() => {
    load();
  }, []);

  const unregisteredEsphome = esphomeCatalog.filter((c) => !c.registered);

  async function applyEsphomeImport(fileName: string) {
    setError("");
    if (!fileName) {
      setImported(null);
      return;
    }

    const res = await fetch(`/api/devices/esphome-suggest?name=${encodeURIComponent(fileName)}`);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Could not read ESPHome YAML");
      return;
    }

    const suggestion: EsphomeImportSuggestion = await res.json();
    setImported(suggestion);
    setForm({
      esphomeFile: fileName,
      name: friendlyDeviceName(suggestion.esphomeName),
      roomId: form.roomId,
      mqttTopicPrefix: suggestion.mqttTopicPrefix,
      esphomeName: suggestion.esphomeName,
      ipAddress: form.ipAddress,
    });
  }

  function openAddFromEsphome(fileName: string) {
    setShowForm(true);
    void applyEsphomeImport(fileName);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const body: Record<string, unknown> = {
      name: form.name,
      roomId: form.roomId || null,
      mqttTopicPrefix: form.mqttTopicPrefix,
      esphomeName: form.esphomeName,
      ipAddress: form.ipAddress || null,
    };

    if (imported) {
      body.sensors = imported.sensors;
      body.relays = imported.relays;
    }

    const res = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowForm(false);
      setImported(null);
      setForm({
        esphomeFile: "",
        name: "",
        roomId: "",
        mqttTopicPrefix: "",
        esphomeName: "",
        ipAddress: "",
      });
      load();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create device");
    }
  }

  const esphomeUrl = esphomeDashboardUrl(hostname);

  return (
    <div>
      <div className="card mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-foreground">ESPHome Builder</h2>
          <p className="text-sm text-muted-foreground">
            Flash firmware and manage YAML — devices do not appear here automatically
          </p>
        </div>
        <a
          href={esphomeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-center"
        >
          Open ESPHome →
        </a>
      </div>

      <div className="card mb-6 border-primary/20 bg-primary/5 text-sm text-foreground">
        <p className="font-medium">How ESPHome connects to Nexternel</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>
            <strong className="text-foreground">ESPHome Builder</strong> — create YAML, compile, and
            flash the ESP32. When it shows Online there, the hardware is working.
          </li>
          <li>
            <strong className="text-foreground">Devices (this page)</strong> — register the same
            device in our database so the dashboard, MQTT topics, and automations know about it.
          </li>
          <li>
            <strong className="text-foreground">Dashboard</strong> — add a widget (e.g. Device
            sensors) and pick the device you registered.
          </li>
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">
          MQTT topic prefix and entity IDs must match your ESPHome YAML (
          <code className="rounded bg-muted px-1">topic_prefix</code>, sensor/switch{" "}
          <code className="rounded bg-muted px-1">id</code> fields).
        </p>
      </div>

      {esphomeDirHint && (
        <div className="card mb-6 border-amber-500/30 bg-amber-500/10 text-sm text-foreground">
          {esphomeDirHint}
        </div>
      )}

      {unregisteredEsphome.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-semibold text-foreground">Found in ESPHome, not registered yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These YAML configs exist on the server. Click Register to add them to Nexternel.
          </p>
          <ul className="mt-4 space-y-2">
            {unregisteredEsphome.map((entry) => (
              <li
                key={entry.fileName}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {entry.suggestion?.esphomeName || entry.fileName}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">{entry.mqttTopicPrefix}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.sensorCount} sensor{entry.sensorCount === 1 ? "" : "s"},{" "}
                    {entry.relayCount} relay{entry.relayCount === 1 ? "" : "s"} in YAML
                  </p>
                </div>
                <Button type="button" size="sm" onClick={() => openAddFromEsphome(entry.fileName)}>
                  Register device
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Devices</h1>
          <p className="text-sm text-muted-foreground">
            Registered ESP32 devices for dashboard, MQTT, and automations
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add device"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <h2 className="font-semibold text-foreground">Register new device</h2>
          <p className="text-xs text-muted-foreground">
            Pick an ESPHome config to auto-fill MQTT prefix, sensors, and relays from the YAML file
            on the server (<code className="rounded bg-muted px-1">esphome/*.yaml</code>).
          </p>

          <div>
            <label className="label">Import from ESPHome YAML</label>
            <select
              className="input"
              value={form.esphomeFile}
              onChange={(e) => void applyEsphomeImport(e.target.value)}
            >
              <option value="">— Select config or fill in manually —</option>
              {esphomeCatalog.map((c) => (
                <option key={c.fileName} value={c.fileName}>
                  {c.fileName}.yaml
                  {c.registered ? " (already registered)" : ""}
                </option>
              ))}
            </select>
          </div>

          {imported && (
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              From YAML: {imported.sensors.length} sensor(s), {imported.relays.length} relay(s)
              {imported.sensors.length === 0 && imported.relays.length === 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {" "}
                  — no entities detected; add them manually after saving.
                </span>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Display name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">{AREA.singular}</label>
              <select
                className="input"
                value={form.roomId}
                onChange={(e) => setForm({ ...form, roomId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">MQTT topic prefix</label>
              <input
                className="input font-mono text-sm"
                value={form.mqttTopicPrefix}
                onChange={(e) => setForm({ ...form, mqttTopicPrefix: e.target.value })}
                placeholder="damnhome/my-device"
                required
              />
            </div>
            <div>
              <label className="label">ESPHome name</label>
              <input
                className="input"
                value={form.esphomeName}
                onChange={(e) => setForm({ ...form, esphomeName: e.target.value })}
                placeholder="my-device"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">IP address (optional)</label>
              <input
                className="input"
                value={form.ipAddress}
                onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
                placeholder="192.168.1.50"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" className="btn-primary">
            Save device
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : devices.length === 0 ? (
        <div className="card space-y-2 text-foreground">
          <p>No devices registered in Nexternel yet.</p>
          {unregisteredEsphome.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              Use <strong>Register device</strong> above for your ESPHome config, or open{" "}
              <strong>Add device</strong> and import from YAML.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Create the device in ESPHome Builder first, then register it here with matching MQTT
              settings.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              rooms={rooms}
              hostname={hostname}
              onChanged={load}
              onRelayRenamed={(relayId, name) => handleRelayRenamed(device.id, relayId, name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
