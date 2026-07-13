"use client";

import { useCallback, useEffect, useState } from "react";
import { AREA } from "@/lib/area-labels";
import { formatLastSeen, esphomeDashboardUrl } from "@/lib/device-utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface DeviceRecord {
  id: string;
  name: string;
  slug: string;
  mqttTopicPrefix: string;
  esphomeName: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  isOnline: boolean;
  isEnabled: boolean;
  lastSeenAt: string | null;
  room: { id: string; name: string } | null;
  sensors: {
    id: string;
    name: string;
    sensorType: string;
    unit: string | null;
    esphomeEntityId: string | null;
    mqttStateTopic: string;
    isEnabled: boolean;
  }[];
  relays: {
    id: string;
    name: string;
    esphomeEntityId: string | null;
    mqttCommandTopic: string;
    mqttStateTopic: string;
    lastState: string | null;
    isEnabled: boolean;
  }[];
}

interface Room {
  id: string;
  name: string;
}

type Panel = "live" | "mqtt" | "activity" | "entities" | "edit" | null;

export function DeviceCard({
  device,
  rooms,
  hostname,
  onChanged,
  onRelayRenamed,
}: {
  device: DeviceRecord;
  rooms: Room[];
  hostname: string;
  onChanged: () => void;
  onRelayRenamed?: (relayId: string, name: string) => void;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [liveReadings, setLiveReadings] = useState<
    { sensorId: string; name: string; latest: number | null; unit: string | null; isLive?: boolean }[]
  >([]);
  const [editingRelayId, setEditingRelayId] = useState<string | null>(null);
  const [relayRename, setRelayRename] = useState("");
  const [activity, setActivity] = useState<
    { id: string; category: string; message: string; createdAt: string }[]
  >([]);
  const [mqttProbe, setMqttProbe] = useState<{
    mqttConnected: boolean;
    registeredTopicsSeen: number;
    hints: string[];
    discoveredSwitches: { entityId: string; stateTopic: string; state: string | null }[];
    registered: {
      name: string;
      seenOnBroker: boolean;
      brokerState: string | null;
      stateTopic: string;
    }[];
    allTopics: { topic: string; payload: string }[];
  } | null>(null);

  const [editForm, setEditForm] = useState({
    name: device.name,
    roomId: device.room?.id || "",
    mqttTopicPrefix: device.mqttTopicPrefix,
    esphomeName: device.esphomeName || "",
    ipAddress: device.ipAddress || "",
    macAddress: device.macAddress || "",
  });

  useEffect(() => {
    setEditForm({
      name: device.name,
      roomId: device.room?.id || "",
      mqttTopicPrefix: device.mqttTopicPrefix,
      esphomeName: device.esphomeName || "",
      ipAddress: device.ipAddress || "",
      macAddress: device.macAddress || "",
    });
  }, [device]);

  const esphomeUrl = esphomeDashboardUrl(hostname, device.esphomeName || device.slug);

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }, []);

  async function refreshStatus() {
    setBusy(true);
    await fetch(`/api/devices/${device.id}/refresh`, { method: "POST" });
    setBusy(false);
    onChanged();
  }

  async function toggleEnabled() {
    setBusy(true);
    await fetch(`/api/devices/${device.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled: !device.isEnabled }),
    });
    setBusy(false);
    onChanged();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch(`/api/devices/${device.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        roomId: editForm.roomId || null,
        mqttTopicPrefix: editForm.mqttTopicPrefix,
        esphomeName: editForm.esphomeName || null,
        ipAddress: editForm.ipAddress || null,
        macAddress: editForm.macAddress || null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save");
      return;
    }
    setPanel(null);
    onChanged();
  }

  async function deleteDevice() {
    if (!confirm(`Delete "${device.name}" and all its sensors/relays? This cannot be undone.`)) return;
    setBusy(true);
    await fetch(`/api/devices/${device.id}`, { method: "DELETE" });
    setBusy(false);
    onChanged();
  }

  async function exportDevice() {
    const res = await fetch(`/api/devices/${device.id}/export`);
    if (!res.ok) return;
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${device.slug}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function duplicateDevice() {
    const name = prompt("Name for the new device", `${device.name} (copy)`);
    if (!name) return;
    const prefix = prompt("MQTT topic prefix", `${device.mqttTopicPrefix}-copy`);
    if (!prefix) return;
    setBusy(true);
    const res = await fetch(`/api/devices/${device.id}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, mqttTopicPrefix: prefix }),
    });
    setBusy(false);
    if (res.ok) onChanged();
  }

  async function syncEsphome() {
    setBusy(true);
    const res = await fetch(`/api/devices/${device.id}/sync-esphome`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Sync failed");
      return;
    }
    const data = await res.json();
    const relayList =
      data.relaysInYaml?.length > 0
        ? `\nRelays in YAML: ${data.relaysInYaml.join(", ")}`
        : "\nNo relays found in YAML — check switch: section or add relays manually.";
    alert(
      `Synced from ${data.yamlFile || "ESPHome"} YAML.\nMQTT prefix: ${data.mqttTopicPrefix}\nAdded ${data.addedRelays} relay(s), updated ${data.updatedRelays ?? 0} relay(s).\nTotal: ${data.totalRelays} relay(s).${relayList}\nStatus: ${data.isOnline ? "Online" : "Offline"}\n\nIf names were wrong (e.g. "S"), they should now show Switch 1, Switch 2, etc.`
    );
    onChanged();
  }

  async function runMqttProbe() {
    setBusy(true);
    const res = await fetch(`/api/devices/${device.id}/mqtt-probe`);
    setBusy(false);
    if (res.ok) setMqttProbe(await res.json());
    else setMqttProbe(null);
  }

  async function repairMqttTopics() {
    setBusy(true);
    const res = await fetch(`/api/devices/${device.id}/mqtt-probe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "repair" }),
    });
    setBusy(false);
    if (!res.ok) {
      alert("Could not repair MQTT topics");
      return;
    }
    const data = await res.json();
    setMqttProbe(data.probe ?? null);
    alert(
      `Updated ${data.repaired ?? 0} relay topic(s).\nDevice status: ${data.isOnline ? "Online" : "Still offline — ESP may not be on MQTT"}`
    );
    onChanged();
  }

  async function openPanel(next: Panel) {
    setPanel(next);
    setError("");
    if (next === "live") {
      const res = await fetch("/api/readings/latest");
      if (res.ok) {
        const all = await res.json();
        const ids = new Set(device.sensors.map((s) => s.id));
        setLiveReadings(all.filter((r: { sensorId: string }) => ids.has(r.sensorId)));
      }
    }
    if (next === "activity") {
      const res = await fetch(`/api/devices/${device.id}/activity?limit=25`);
      if (res.ok) setActivity(await res.json());
    }
    if (next === "mqtt") {
      setMqttProbe(null);
      void runMqttProbe();
    }
  }

  async function toggleRelay(relayId: string, turnOn: boolean) {
    await fetch(`/api/relays/${relayId}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: turnOn ? "ON" : "OFF" }),
    });
    onChanged();
  }

  async function renameRelay(relayId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setEditingRelayId(null);
    setRelayRename("");
    onRelayRenamed?.(relayId, trimmed);
    const res = await fetch(`/api/relays/${relayId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) {
      onChanged();
    }
  }

  return (
    <div
      className={cn(
        "card",
        !device.isEnabled && "opacity-60",
        !device.isOnline && device.isEnabled && "border-destructive/30"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">{device.name}</h3>
            {!device.isEnabled ? (
              <span className="badge-offline">Disabled</span>
            ) : device.isOnline ? (
              <span className="badge-online">Online</span>
            ) : (
              <span className="badge-offline">Offline</span>
            )}
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{device.mqttTopicPrefix}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {device.room?.name || "Unassigned"}
            {device.ipAddress ? ` · ${device.ipAddress}` : ""}
            {" · Last seen "}
            {formatLastSeen(device.lastSeenAt)}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-8 shrink-0">
              Actions ▾
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => openPanel("edit")}>Edit device</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openPanel("live")}>Live readings</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openPanel("mqtt")}>MQTT topics</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openPanel("activity")}>Activity log</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openPanel("entities")}>Manage sensors & relays</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={refreshStatus} disabled={busy}>
              Refresh status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copyText(device.mqttTopicPrefix)}>
              Copy MQTT prefix
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={esphomeUrl} target="_blank" rel="noopener noreferrer">
                Open in ESPHome
              </a>
            </DropdownMenuItem>
            {device.relays.length > 0 && (
              <DropdownMenuItem asChild>
                <a
                  href={`/admin/dashboard?add=classic&type=device_relays&deviceId=${device.id}`}
                >
                  Add relay panel to dashboard
                </a>
              </DropdownMenuItem>
            )}
            {device.sensors.length > 0 && (
              <DropdownMenuItem asChild>
                <a
                  href={`/admin/dashboard?add=classic&type=device_sensors&deviceId=${device.id}`}
                >
                  Add sensor widget to dashboard
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <a href={`/admin/automations?deviceId=${device.id}`}>Automations</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={duplicateDevice}>Duplicate template</DropdownMenuItem>
            <DropdownMenuItem onClick={syncEsphome} disabled={busy}>
              Sync relays/sensors from ESPHome
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportDevice}>Export JSON</DropdownMenuItem>
            <DropdownMenuItem onClick={toggleEnabled}>
              {device.isEnabled ? "Disable device" : "Enable device"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={deleteDevice} className="text-destructive focus:text-destructive">
              Delete device…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => openPanel("edit")}>
          Edit
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => openPanel("live")}>
          Live data
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={refreshStatus} disabled={busy}>
          Refresh
        </Button>
        <Button type="button" size="sm" variant="secondary" asChild>
          <a href={esphomeUrl} target="_blank" rel="noopener noreferrer">
            ESPHome
          </a>
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={syncEsphome} disabled={busy}>
          Sync ESPHome
        </Button>
      </div>

      {device.relays.length === 0 && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
          <p className="font-medium text-foreground">No relays registered</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Click <strong>Sync ESPHome</strong> to import relays from your YAML, or use{" "}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => openPanel("entities")}
            >
              Manage sensors &amp; relays
            </button>{" "}
            to add them manually (entity id must match ESPHome <code className="rounded bg-muted px-0.5">id:</code>).
          </p>
        </div>
      )}

      {device.relays.filter((r) => r.isEnabled).length > 0 && (
        <div className="mt-4 border-t border-border/50 pt-3">
          <div className="mb-2">
            <p className="text-xs font-medium text-muted-foreground">Relay controls</p>
            <p className="text-[10px] text-muted-foreground">
              Use <strong className="font-medium text-foreground">Rename</strong> to set labels shown on dashboard widgets.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {device.relays
              .filter((r) => r.isEnabled)
              .map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/50 px-3 py-2"
                >
                  {editingRelayId === r.id ? (
                    <form
                      className="flex flex-wrap items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void renameRelay(r.id, relayRename);
                      }}
                    >
                      <input
                        className="input h-8 min-w-[8rem] flex-1 text-sm"
                        value={relayRename}
                        onChange={(e) => setRelayRename(e.target.value)}
                        placeholder="Relay name"
                        autoFocus
                      />
                      <Button type="submit" size="sm" className="h-8">
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => {
                          setEditingRelayId(null);
                          setRelayRename("");
                        }}
                      >
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 shrink-0 px-2.5 text-xs"
                        onClick={() => {
                          setEditingRelayId(r.id);
                          setRelayRename(r.name);
                        }}
                      >
                        Rename
                      </Button>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.name}</span>
                      <span
                        className={
                          r.lastState === "ON" ? "badge-online shrink-0" : "badge-offline shrink-0"
                        }
                      >
                        {r.lastState || "—"}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 flex-1"
                      onClick={() => toggleRelay(r.id, true)}
                    >
                      ON
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 flex-1"
                      onClick={() => toggleRelay(r.id, false)}
                    >
                      OFF
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" asChild>
                      <a href={`/admin/dashboard?add=classic&type=relay&relayId=${r.id}`}>
                        + Dashboard
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Sensors</p>
          <ul className="mt-1 space-y-0.5 text-sm text-foreground">
            {device.sensors.map((s) => (
              <li key={s.id} className={!s.isEnabled ? "text-muted-foreground line-through" : ""}>
                {s.name} ({s.sensorType})
              </li>
            ))}
            {device.sensors.length === 0 && (
              <li className="text-muted-foreground">None</li>
            )}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Relays</p>
          <ul className="mt-1 space-y-0.5 text-sm text-foreground">
            {device.relays.map((r) => (
              <li key={r.id} className={!r.isEnabled ? "text-muted-foreground line-through" : ""}>
                {r.name}
              </li>
            ))}
            {device.relays.length === 0 && (
              <li className="text-muted-foreground">None</li>
            )}
          </ul>
        </div>
      </div>

      {panel === "edit" && (
        <form onSubmit={saveEdit} className="mt-4 space-y-3 border-t border-border/50 pt-4">
          <p className="text-sm font-semibold">Edit device</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Display name</label>
              <input
                className="input"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">{AREA.singular}</label>
              <select
                className="input"
                value={editForm.roomId}
                onChange={(e) => setEditForm({ ...editForm, roomId: e.target.value })}
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
                value={editForm.mqttTopicPrefix}
                onChange={(e) => setEditForm({ ...editForm, mqttTopicPrefix: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">ESPHome name</label>
              <input
                className="input"
                value={editForm.esphomeName}
                onChange={(e) => setEditForm({ ...editForm, esphomeName: e.target.value })}
              />
            </div>
            <div>
              <label className="label">IP address</label>
              <input
                className="input"
                value={editForm.ipAddress}
                onChange={(e) => setEditForm({ ...editForm, ipAddress: e.target.value })}
              />
            </div>
            <div>
              <label className="label">MAC address</label>
              <input
                className="input"
                value={editForm.macAddress}
                onChange={(e) => setEditForm({ ...editForm, macAddress: e.target.value })}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPanel(null)}>
              Close
            </Button>
          </div>
        </form>
      )}

      {panel === "live" && (
        <div className="mt-4 border-t border-border/50 pt-4">
          <p className="mb-2 text-sm font-semibold">Live readings</p>
          <ul className="space-y-1 text-sm">
            {liveReadings.map((r) => (
              <li key={r.sensorId} className="flex justify-between gap-2">
                <span>{r.name}</span>
                <span className="tabular-nums">
                  {r.latest != null ? `${r.latest}${r.unit ? ` ${r.unit}` : ""}` : "—"}
                  {r.isLive ? " · live" : ""}
                </span>
              </li>
            ))}
            {liveReadings.length === 0 && (
              <li className="text-muted-foreground">No readings yet</li>
            )}
          </ul>
          <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={() => setPanel(null)}>
            Close
          </Button>
        </div>
      )}

      {panel === "mqtt" && (
        <div className="mt-4 border-t border-border/50 pt-4 text-xs">
          <p className="mb-2 text-sm font-semibold">MQTT topics</p>
          <p className="mb-2 font-mono text-muted-foreground">Prefix: {device.mqttTopicPrefix}</p>
          {device.sensors.map((s) => (
            <p key={s.id} className="mb-1 break-all font-mono">
              {s.name}: {s.mqttStateTopic}
            </p>
          ))}
          {device.relays.map((r) => (
            <div key={r.id} className="mb-1">
              <p className="break-all font-mono">
                {r.name} cmd: {r.mqttCommandTopic}
              </p>
              <p className="break-all font-mono text-muted-foreground">
                state: {r.mqttStateTopic}
                {r.lastState ? ` (${r.lastState})` : ""}
              </p>
            </div>
          ))}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void runMqttProbe()}>
              Scan broker
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void repairMqttTopics()}>
              Fix topics from broker
            </Button>
          </div>

          {mqttProbe && (
            <div className="mt-3 rounded-md border border-border/60 bg-muted/30 p-3">
              <p className="mb-1 font-semibold text-foreground">
                Broker scan:{" "}
                {mqttProbe.mqttConnected ? (
                  <span className="text-green-600">traffic seen</span>
                ) : (
                  <span className="text-destructive">no traffic on prefix</span>
                )}
                {" · "}
                {mqttProbe.registeredTopicsSeen}/{device.relays.length} registered state topics found
              </p>
              {mqttProbe.hints.map((h) => (
                <p key={h} className="mt-1 text-muted-foreground">
                  {h}
                </p>
              ))}
              {mqttProbe.discoveredSwitches.length > 0 && (
                <div className="mt-2">
                  <p className="font-semibold">Switches on broker:</p>
                  {mqttProbe.discoveredSwitches.map((d) => (
                    <p key={d.stateTopic} className="font-mono text-muted-foreground">
                      {d.entityId}: {d.state ?? "?"}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={() => setPanel(null)}>
            Close
          </Button>
        </div>
      )}

      {panel === "activity" && (
        <div className="mt-4 border-t border-border/50 pt-4">
          <p className="mb-2 text-sm font-semibold">Recent activity</p>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
            {activity.map((a) => (
              <li key={a.id} className="text-muted-foreground">
                <span className="text-foreground">[{a.category}]</span> {a.message}
              </li>
            ))}
            {activity.length === 0 && <li className="text-muted-foreground">No entries</li>}
          </ul>
          <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={() => setPanel(null)}>
            Close
          </Button>
        </div>
      )}

      {panel === "entities" && (
        <DeviceEntitiesPanel
          device={device}
          onClose={() => setPanel(null)}
          onChanged={onChanged}
          onRelayRenamed={onRelayRenamed}
        />
      )}
    </div>
  );
}

function DeviceEntitiesPanel({
  device,
  onClose,
  onChanged,
  onRelayRenamed,
}: {
  device: DeviceRecord;
  onClose: () => void;
  onChanged: () => void;
  onRelayRenamed?: (relayId: string, name: string) => void;
}) {
  const [sensorForm, setSensorForm] = useState({
    name: "",
    sensorType: "temperature",
    unit: "°C",
    esphomeEntityId: "",
  });
  const [relayForm, setRelayForm] = useState({ name: "", esphomeEntityId: "" });
  const [editingRelayId, setEditingRelayId] = useState<string | null>(null);
  const [relayRename, setRelayRename] = useState("");

  async function renameRelay(relayId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setEditingRelayId(null);
    setRelayRename("");
    onRelayRenamed?.(relayId, trimmed);
    const res = await fetch(`/api/relays/${relayId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) {
      onChanged();
    }
  }

  async function addSensor(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/devices/${device.id}/sensors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sensorForm),
    });
    setSensorForm({ name: "", sensorType: "temperature", unit: "°C", esphomeEntityId: "" });
    onChanged();
  }

  async function addRelay(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/devices/${device.id}/relays`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(relayForm),
    });
    setRelayForm({ name: "", esphomeEntityId: "" });
    onChanged();
  }

  async function toggleSensorEnabled(id: string, isEnabled: boolean) {
    await fetch(`/api/sensors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled: !isEnabled }),
    });
    onChanged();
  }

  async function toggleRelayEnabled(id: string, isEnabled: boolean) {
    await fetch(`/api/relays/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled: !isEnabled }),
    });
    onChanged();
  }

  async function removeSensor(id: string) {
    if (!confirm("Remove this sensor?")) return;
    await fetch(`/api/sensors/${id}`, { method: "DELETE" });
    onChanged();
  }

  async function removeRelay(id: string) {
    if (!confirm("Remove this relay?")) return;
    await fetch(`/api/relays/${id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
      <p className="text-sm font-semibold">Manage sensors & relays</p>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Sensors</p>
        <ul className="mb-2 space-y-1 text-sm">
          {device.sensors.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2">
              <span className={!s.isEnabled ? "line-through text-muted-foreground" : ""}>{s.name}</span>
              <button type="button" className="text-xs text-primary" onClick={() => toggleSensorEnabled(s.id, s.isEnabled)}>
                {s.isEnabled ? "Disable" : "Enable"}
              </button>
              <button type="button" className="text-xs text-destructive" onClick={() => removeSensor(s.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={addSensor} className="flex flex-wrap gap-2">
          <input
            className="input min-w-[8rem] flex-1 text-sm"
            placeholder="Name"
            value={sensorForm.name}
            onChange={(e) => setSensorForm({ ...sensorForm, name: e.target.value })}
            required
          />
          <input
            className="input w-24 text-sm"
            placeholder="Entity id"
            value={sensorForm.esphomeEntityId}
            onChange={(e) => setSensorForm({ ...sensorForm, esphomeEntityId: e.target.value })}
          />
          <Button type="submit" size="sm">
            Add sensor
          </Button>
        </form>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Relays</p>
        <ul className="mb-2 space-y-1 text-sm">
          {device.relays.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border/40 px-2 py-1.5">
              {editingRelayId === r.id ? (
                <form
                  className="flex w-full flex-wrap items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void renameRelay(r.id, relayRename);
                  }}
                >
                  <input
                    className="input min-w-[8rem] flex-1 text-sm"
                    value={relayRename}
                    onChange={(e) => setRelayRename(e.target.value)}
                    autoFocus
                  />
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingRelayId(null);
                      setRelayRename("");
                    }}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0 px-2 text-xs"
                    onClick={() => {
                      setEditingRelayId(r.id);
                      setRelayRename(r.name);
                    }}
                  >
                    Rename
                  </Button>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-sm",
                      !r.isEnabled && "line-through text-muted-foreground"
                    )}
                  >
                    {r.name}
                  </span>
                </>
              )}
              <button type="button" className="text-xs text-primary" onClick={() => toggleRelayEnabled(r.id, r.isEnabled)}>
                {r.isEnabled ? "Disable" : "Enable"}
              </button>
              <button type="button" className="text-xs text-destructive" onClick={() => removeRelay(r.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={addRelay} className="flex flex-wrap gap-2">
          <input
            className="input min-w-[8rem] flex-1 text-sm"
            placeholder="Name"
            value={relayForm.name}
            onChange={(e) => setRelayForm({ ...relayForm, name: e.target.value })}
            required
          />
          <input
            className="input w-24 text-sm"
            placeholder="Entity id"
            value={relayForm.esphomeEntityId}
            onChange={(e) => setRelayForm({ ...relayForm, esphomeEntityId: e.target.value })}
          />
          <Button type="submit" size="sm">
            Add relay
          </Button>
        </form>
      </div>

      <Button type="button" size="sm" variant="ghost" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}
