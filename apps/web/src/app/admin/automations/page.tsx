"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AREA } from "@/lib/area-labels";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { relaysForDevice } from "@/lib/relay-order";

type TriggerType = "time_schedule" | "sensor_threshold" | "device_online" | "area_sensor";
type ActionType = "relay_on" | "relay_off" | "relay_toggle";

interface Automation {
  id: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  actionType: string;
  actionConfig: Record<string, unknown>;
}

interface Catalog {
  areas: { id: string; name: string }[];
  relays: { id: string; name: string; deviceName?: string; deviceId?: string; createdAt?: string }[];
  sensors: { id: string; name: string; deviceName: string; deviceId: string; roomId: string | null }[];
  devices: { id: string; name: string }[];
}

type CatalogRelay = Catalog["relays"][number] & { deviceId: string };

const TRIGGER_LABELS: Record<TriggerType, string> = {
  time_schedule: "Time & date",
  sensor_threshold: "Sensor reading",
  device_online: "Device online/offline",
  area_sensor: `Sensor in ${AREA.singular.toLowerCase()}`,
};

const ACTION_LABELS: Record<ActionType, string> = {
  relay_on: "Turn relay ON",
  relay_off: "Turn relay OFF",
  relay_toggle: "Toggle relay",
};

function describeAutomation(a: Automation, catalog: Catalog | null): string {
  const trigger = TRIGGER_LABELS[a.triggerType as TriggerType] || a.triggerType;
  const action = ACTION_LABELS[a.actionType as ActionType] || a.actionType;
  const cfg = a.triggerConfig || {};
  const act = a.actionConfig || {};
  const relay = catalog?.relays.find((r) => r.id === act.relayId);
  let when = trigger;
  if (a.triggerType === "time_schedule" && cfg.time) when = `At ${cfg.time}`;
  if (a.triggerType === "sensor_threshold" && cfg.sensorId) {
    const s = catalog?.sensors.find((x) => x.id === cfg.sensorId);
    when = `${s?.name || "Sensor"} ${cfg.operator || ">"} ${cfg.value ?? ""}`;
  }
  if (a.triggerType === "area_sensor" && cfg.areaId) {
    const ar = catalog?.areas.find((x) => x.id === cfg.areaId);
    when = `Sensor in ${ar?.name || "area"}`;
  }
  return `${when} → ${action}${relay ? ` (${relay.name})` : ""}`;
}

function automationTouchesDevice(
  a: Automation,
  filterDeviceId: string,
  catalog: Catalog | null
): boolean {
  const cfg = a.triggerConfig || {};
  const act = a.actionConfig || {};
  if (a.triggerType === "device_online" && cfg.deviceId === filterDeviceId) return true;
  if (cfg.sensorId) {
    const s = catalog?.sensors.find((x) => x.id === cfg.sensorId);
    if (s?.deviceId === filterDeviceId) return true;
  }
  if (act.relayId) {
    const r = catalog?.relays.find((x) => x.id === act.relayId);
    if (r?.deviceId === filterDeviceId) return true;
  }
  return false;
}

function AutomationsAdminInner() {
  const searchParams = useSearchParams();
  const filterDeviceId = searchParams.get("deviceId");
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("time_schedule");
  const [actionType, setActionType] = useState<ActionType>("relay_on");
  const [relayId, setRelayId] = useState("");
  const [time, setTime] = useState("08:00");
  const [sensorId, setSensorId] = useState("");
  const [operator, setOperator] = useState(">");
  const [threshold, setThreshold] = useState("25");
  const [areaId, setAreaId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [onlineState, setOnlineState] = useState("online");

  async function load() {
    const [autoRes, roomsRes, devicesRes] = await Promise.all([
      fetch("/api/automations"),
      fetch("/api/rooms"),
      fetch("/api/devices"),
    ]);
    if (autoRes.ok) setAutomations(await autoRes.json());

    const areas = roomsRes.ok ? await roomsRes.json() : [];
    const devicesRaw = devicesRes.ok ? await devicesRes.json() : [];
    const relays: Catalog["relays"] = [];
    const sensors: Catalog["sensors"] = [];
    const devices: Catalog["devices"] = [];

    for (const d of devicesRaw) {
      devices.push({ id: d.id, name: d.name });
      for (const r of d.relays || []) {
        relays.push({ id: r.id, name: r.name, deviceName: d.name, deviceId: d.id });
      }
      for (const s of d.sensors || []) {
        sensors.push({
          id: s.id,
          name: s.name,
          deviceName: d.name,
          deviceId: d.id,
          roomId: d.roomId,
        });
      }
    }

    setCatalog({
      areas: areas.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })),
      relays,
      sensors,
      devices,
    });
    if (relays[0] && !relayId) setRelayId(relays[0].id);
    if (sensors[0] && !sensorId) setSensorId(sensors[0].id);
    if (areas[0] && !areaId) setAreaId(areas[0].id);
    if (devices[0] && !deviceId) setDeviceId(devices[0].id);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function buildTriggerConfig(): Record<string, unknown> {
    switch (triggerType) {
      case "time_schedule":
        return { time, days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] };
      case "sensor_threshold":
        return { sensorId, operator, value: Number(threshold) };
      case "device_online":
        return { deviceId, state: onlineState };
      case "area_sensor":
        return { areaId, operator, value: Number(threshold) };
      default:
        return {};
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!relayId) {
      setError("Select a relay for the action");
      return;
    }
    const res = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        triggerType,
        triggerConfig: buildTriggerConfig(),
        actionType,
        actionConfig: { relayId },
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to create automation");
      return;
    }
    setName("");
    setDescription("");
    setShowForm(false);
    load();
  }

  async function toggleEnabled(a: Automation) {
    await fetch(`/api/automations/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled: !a.isEnabled }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this automation?")) return;
    await fetch(`/api/automations/${id}`, { method: "DELETE" });
    load();
  }

  useEffect(() => {
    if (filterDeviceId) {
      setDeviceId(filterDeviceId);
      setTriggerType("device_online");
    }
  }, [filterDeviceId]);

  const filterDeviceName = filterDeviceId
    ? catalog?.devices.find((d) => d.id === filterDeviceId)?.name
    : null;

  const visibleAutomations = filterDeviceId
    ? automations.filter((a) => automationTouchesDevice(a, filterDeviceId, catalog))
    : automations;

  const deviceRelays: Catalog["relays"] =
    filterDeviceId && catalog
      ? relaysForDevice(
          catalog.relays.filter((r): r is CatalogRelay => typeof r.deviceId === "string"),
          filterDeviceId
        )
      : catalog?.relays ?? [];

  const areaSensors =
    catalog?.sensors.filter((s) => s.roomId === areaId) || [];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            When something happens (time, sensor, device, or {AREA.singular.toLowerCase()}), run an
            action such as turning a relay on or off. Rules are stored here; Node-RED can evaluate
            them in a future update.
          </p>
        </div>
        <Button type="button" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "New automation"}
        </Button>
      </div>

      {filterDeviceId && filterDeviceName && (
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 border-primary/30 bg-primary/5 text-sm">
          <p>
            Showing automations related to <strong>{filterDeviceName}</strong>
          </p>
          <Link href="/admin/automations" className="text-primary hover:underline">
            Show all
          </Link>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-4">
          <h2 className="font-semibold text-foreground">Create automation</h2>
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">When (trigger)</label>
              <select
                className="input"
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value as TriggerType)}
              >
                {(Object.keys(TRIGGER_LABELS) as TriggerType[]).map((t) => (
                  <option key={t} value={t}>
                    {TRIGGER_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Then (action)</label>
              <select
                className="input"
                value={actionType}
                onChange={(e) => setActionType(e.target.value as ActionType)}
              >
                {(Object.keys(ACTION_LABELS) as ActionType[]).map((t) => (
                  <option key={t} value={t}>
                    {ACTION_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {triggerType === "time_schedule" && (
            <div>
              <label className="label">Time of day</label>
              <input
                type="time"
                className="input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          )}

          {triggerType === "sensor_threshold" && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="label">Sensor</label>
                <select className="input" value={sensorId} onChange={(e) => setSensorId(e.target.value)}>
                  {catalog?.sensors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.deviceName})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Condition</label>
                <div className="flex gap-2">
                  <select className="input w-16" value={operator} onChange={(e) => setOperator(e.target.value)}>
                    <option>&gt;</option>
                    <option>&lt;</option>
                    <option>=</option>
                  </select>
                  <input className="input" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {triggerType === "device_online" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Device</label>
                <select className="input" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
                  {catalog?.devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">State</label>
                <select className="input" value={onlineState} onChange={(e) => setOnlineState(e.target.value)}>
                  <option value="online">Goes online</option>
                  <option value="offline">Goes offline</option>
                </select>
              </div>
            </div>
          )}

          {triggerType === "area_sensor" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">{AREA.singular}</label>
                <select className="input" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                  {catalog?.areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {areaSensors.length} sensor(s) in this {AREA.singular.toLowerCase()}
                </p>
              </div>
              <div>
                <label className="label">Any reading</label>
                <div className="flex gap-2">
                  <select className="input w-16" value={operator} onChange={(e) => setOperator(e.target.value)}>
                    <option>&gt;</option>
                    <option>&lt;</option>
                  </select>
                  <input className="input" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="label">Relay</label>
            <select className="input" value={relayId} onChange={(e) => setRelayId(e.target.value)}>
              {(filterDeviceId ? deviceRelays : catalog?.relays || []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.deviceName})
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button type="submit" className="btn-primary">
            Save automation
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : visibleAutomations.length === 0 ? (
        <p className="text-muted-foreground">
          {filterDeviceId
            ? "No automations for this device yet."
            : "No automations yet. Create one to get started."}
        </p>
      ) : (
        <ul className="space-y-3">
          {visibleAutomations.map((a) => (
            <li key={a.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{a.name}</p>
                <p className="text-sm text-muted-foreground">{describeAutomation(a, catalog)}</p>
                {a.description && (
                  <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={a.isEnabled ? "badge-online" : "badge-offline"}>
                  {a.isEnabled ? "Enabled" : "Disabled"}
                </span>
                <Button type="button" size="sm" variant="outline" onClick={() => toggleEnabled(a)}>
                  {a.isEnabled ? "Disable" : "Enable"}
                </Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => remove(a.id)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AutomationsAdminPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading automations…</p>}>
      <AutomationsAdminInner />
    </Suspense>
  );
}
