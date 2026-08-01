import mqtt, { type MqttClient } from "mqtt";
import { config } from "../config.js";
import {
  listDevicePrefixes,
  listShellySwitchBindings,
  listStateTopicBindings,
  getCapabilityById,
} from "../capabilities/store.js";
import { getLiveState, parseMqttPayload, setLiveState } from "./state-cache.js";
import { getPool } from "../db.js";
import { looksLikeShellyCommandTopic } from "../shelly/topics.js";
import { parseShellyMqttSwitchUpdates } from "../shelly/notify.js";
import {
  countSwitchesInStatusResult,
  enrichDiscoveredShelly,
  parseShellyAnnouncePayload,
  type DiscoveredShelly,
} from "../shelly/discover.js";

let client: MqttClient | null = null;
let status: "disconnected" | "connecting" | "connected" | "error" = "disconnected";
let lastError: string | null = null;
let presenceTimer: ReturnType<typeof setInterval> | null = null;

/** state_topic → capability ids (usually one) */
const topicIndex = new Map<string, { capabilityId: string; kind: string }[]>();

/**
 * Shelly: `${prefix}\0switch:N` → capability id.
 * Used for events/rpc NotifyStatus and full /status blobs (status_ntf is off by default).
 */
const shellySwitchIndex = new Map<string, string>();
const shellyPrefixes = new Set<string>();

/** Debounce device online touches (prefix → last ms) */
const lastOnlineTouch = new Map<string, number>();
let cachedPrefixes: string[] = [];

/** Phase 3 discovery temporary listeners (announce / RPC probe replies). */
type DiscoveryCollector = (topic: string, payload: string) => void;
const discoveryCollectors = new Set<DiscoveryCollector>();

function notifyDiscoveryCollectors(topic: string, payload: string) {
  for (const fn of discoveryCollectors) {
    try {
      fn(topic, payload);
    } catch {
      /* ignore */
    }
  }
}

export function getMqttStatus() {
  return { status, lastError, broker: config.mqttBroker() };
}

function shellyIndexKey(prefix: string, componentKey: string): string {
  return `${prefix}\0${componentKey.toLowerCase()}`;
}

function longestPrefixForTopic(topic: string): string | null {
  let best: string | null = null;
  for (const p of cachedPrefixes) {
    if (topic === p || topic.startsWith(`${p}/`)) {
      if (!best || p.length > best.length) best = p;
    }
  }
  return best;
}

async function rebuildTopicIndex() {
  topicIndex.clear();
  shellySwitchIndex.clear();
  shellyPrefixes.clear();

  const bindings = await listStateTopicBindings();
  for (const b of bindings) {
    const list = topicIndex.get(b.state_topic) ?? [];
    list.push({ capabilityId: b.capability_id, kind: b.kind });
    topicIndex.set(b.state_topic, list);
  }

  cachedPrefixes = await listDevicePrefixes();

  const shelly = await listShellySwitchBindings();
  for (const row of shelly) {
    shellyPrefixes.add(row.mqtt_topic_prefix);
    shellySwitchIndex.set(
      shellyIndexKey(row.mqtt_topic_prefix, row.component_key),
      row.capability_id
    );
  }
}

/** Safety net: clear ghost online when no MQTT traffic for a long time (LWT should fire sooner). */
const DEVICE_GHOST_ONLINE_TIMEOUT_MS = 86_400_000; // 24 hours

function applyDeviceRootStatusTopic(topic: string, payload: string): boolean {
  const prefix = longestPrefixForTopic(topic);
  if (!prefix || topic !== `${prefix}/status`) return false;
  const state = payload.trim().toLowerCase();
  if (state === "online" || state === "true" || state === "1") {
    void getPool()
      .query(
        `UPDATE devices
         SET is_online = TRUE, last_seen_at = NOW()
         WHERE mqtt_topic_prefix = $1`,
        [prefix]
      )
      .catch(() => {
        /* ignore */
      });
    return true;
  }
  if (state === "offline" || state === "false" || state === "0") {
    void getPool()
      .query(`UPDATE devices SET is_online = FALSE WHERE mqtt_topic_prefix = $1`, [prefix])
      .catch(() => {
        /* ignore */
      });
    return true;
  }
  return false;
}

/** Shelly Gen1: {prefix}/online → true|false */
function applyDeviceShellyOnlineTopic(topic: string, payload: string): boolean {
  const match = /^(.+)\/online$/i.exec(topic);
  if (!match) return false;
  const prefix = longestPrefixForTopic(topic);
  if (!prefix || prefix !== match[1]) return false;
  const state = payload.trim().toLowerCase();
  if (/^(true|1|online)$/.test(state)) {
    void getPool()
      .query(
        `UPDATE devices
         SET is_online = TRUE, last_seen_at = NOW()
         WHERE mqtt_topic_prefix = $1`,
        [prefix]
      )
      .catch(() => {
        /* ignore */
      });
    return true;
  }
  if (/^(false|0|offline)$/.test(state)) {
    void getPool()
      .query(`UPDATE devices SET is_online = FALSE WHERE mqtt_topic_prefix = $1`, [prefix])
      .catch(() => {
        /* ignore */
      });
    return true;
  }
  return false;
}

function touchDeviceOnlineFromTopic(topic: string) {
  const prefix = longestPrefixForTopic(topic);
  if (!prefix) return;
  const now = Date.now();
  const prev = lastOnlineTouch.get(prefix) ?? 0;
  if (now - prev < 15_000) return;
  lastOnlineTouch.set(prefix, now);
  void getPool()
    .query(
      `UPDATE devices
       SET is_online = TRUE, last_seen_at = NOW()
       WHERE mqtt_topic_prefix = $1`,
      [prefix]
    )
    .catch(() => {
      /* ignore */
    });
}

function applyLiveSwitch(
  capabilityId: string,
  value: unknown,
  retained: boolean
) {
  setLiveState(capabilityId, value, {
    quality: "good",
    retained,
  });
  if (typeof value === "boolean") {
    void getPool()
      .query(
        `UPDATE relays r
         SET last_state = $1, updated_at = NOW()
         FROM capabilities c
         WHERE c.id = $2
           AND c.source_type = 'relay'
           AND r.id = c.source_id`,
        [value ? "ON" : "OFF", capabilityId]
      )
      .catch(() => {
        /* ignore */
      });
  }
}

function applyShellyTopicUpdates(
  topic: string,
  payload: string,
  retained: boolean
): boolean {
  const updates = parseShellyMqttSwitchUpdates(topic, payload);
  if (!updates.length) return false;

  const prefix = longestPrefixForTopic(topic);
  if (!prefix || !shellyPrefixes.has(prefix)) return false;

  let applied = false;
  for (const u of updates) {
    const capabilityId = shellySwitchIndex.get(
      shellyIndexKey(prefix, u.componentKey)
    );
    if (!capabilityId) continue;
    applyLiveSwitch(capabilityId, u.output, retained);
    applied = true;
  }
  return applied;
}

function handleMessage(
  topic: string,
  payloadBuf: Buffer,
  packet: { retain?: boolean }
) {
  const payload = payloadBuf.toString("utf8");
  const retained = Boolean(packet.retain);

  notifyDiscoveryCollectors(topic, payload);

  const presenceHandled =
    applyDeviceRootStatusTopic(topic, payload) ||
    applyDeviceShellyOnlineTopic(topic, payload);
  if (!presenceHandled) {
    touchDeviceOnlineFromTopic(topic);
  }

  // Shelly app / physical switch / status_update → events/rpc or /status
  const shellyHandled = applyShellyTopicUpdates(topic, payload, retained);

  const entries = topicIndex.get(topic);
  if (!entries?.length) return;

  // Avoid double-applying the same Shelly status/switch:N payload
  if (shellyHandled && /\/status\/switch:\d+$/i.test(topic)) return;

  for (const { capabilityId, kind } of entries) {
    const value = parseMqttPayload(kind, payload);
    applyLiveSwitch(capabilityId, value, retained);
  }
}

/** Ask each Shelly to publish full status (fills cache after API restart). */
function requestShellyStatusUpdates() {
  if (!client?.connected) return;
  for (const prefix of shellyPrefixes) {
    try {
      client.publish(`${prefix}/command`, "status_update", { qos: 0 });
    } catch {
      /* ignore */
    }
  }
}

function startPresenceSweeper() {
  if (presenceTimer) return;
  presenceTimer = setInterval(() => {
    void getPool()
      .query(
        `UPDATE devices
         SET is_online = FALSE
         WHERE is_online = TRUE
           AND (
             last_seen_at IS NULL
             OR last_seen_at < NOW() - ($1::double precision * INTERVAL '1 second')
           )`,
        [DEVICE_GHOST_ONLINE_TIMEOUT_MS / 1000]
      )
      .catch(() => {
        /* ignore */
      });
  }, 15_000);
  presenceTimer.unref?.();
}

export async function startTelemetry(): Promise<void> {
  await rebuildTopicIndex();
  startPresenceSweeper();

  if (client) {
    try {
      client.end(true);
    } catch {
      /* ignore */
    }
    client = null;
  }

  status = "connecting";
  lastError = null;

  const broker = config.mqttBroker();
  const username = config.mqttUsername();
  const password = config.mqttPassword();

  client = mqtt.connect(broker, {
    username: username || undefined,
    password: password || undefined,
    clientId: `nexternel-api-${Date.now()}`,
    reconnectPeriod: 5000,
  });

  client.on("connect", async () => {
    status = "connected";
    lastError = null;
    try {
      await rebuildTopicIndex();
      const prefixes = await listDevicePrefixes();
      const topics = new Set<string>();
      for (const prefix of prefixes) {
        topics.add(`${prefix}/#`);
      }
      for (const topic of topicIndex.keys()) {
        topics.add(topic);
      }
      for (const topic of topics) {
        client?.subscribe(topic, { qos: 0 }, (err) => {
          if (err) lastError = err.message;
        });
      }
      // After subscriptions: pull current Shelly outputs (app/physical may not
      // have published status/switch:N because status_ntf defaults to false).
      requestShellyStatusUpdates();
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      status = "error";
    }
  });

  client.on("message", (topic, payload, packet) => {
    handleMessage(topic, payload, packet);
  });

  client.on("error", (err) => {
    status = "error";
    lastError = err.message;
  });

  client.on("close", () => {
    if (status === "connected") status = "disconnected";
  });
}

export async function refreshTelemetrySubscriptions(): Promise<void> {
  await rebuildTopicIndex();
  if (!client?.connected) return;
  const prefixes = await listDevicePrefixes();
  cachedPrefixes = prefixes;
  for (const prefix of prefixes) {
    client.subscribe(`${prefix}/#`, { qos: 0 });
  }
  requestShellyStatusUpdates();
}

export async function publishSwitchCommand(
  capabilityId: string,
  action: "on" | "off" | "toggle"
): Promise<{ value: boolean }> {
  const cap = await getCapabilityById(capabilityId);
  if (!cap) throw new Error("Capability not found");
  if (cap.kind !== "switch") throw new Error("Capability is not a switch");
  if (!cap.command_topic) throw new Error("No command topic for this capability");

  let next: boolean;
  if (action === "toggle") {
    const current = getLiveState(capabilityId);
    next = current?.value !== true;
  } else {
    next = action === "on";
  }

  const shelly =
    cap.firmware_type === "shelly" ||
    looksLikeShellyCommandTopic(cap.command_topic);
  const payload = shelly
    ? next
      ? "on"
      : "off"
    : next
      ? "ON"
      : "OFF";
  const mqttClient = client;
  if (!mqttClient?.connected) {
    throw new Error("MQTT not connected");
  }

  await new Promise<void>((resolve, reject) => {
    mqttClient.publish(cap.command_topic!, payload, { qos: 1 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Optimistic update; state topic / events/rpc will confirm
  applyLiveSwitch(capabilityId, next, false);

  return { value: next };
}

export function stopTelemetry() {
  client?.end(true);
  client = null;
  status = "disconnected";
}

const DISCOVER_SRC = "nexternel/discover";

/**
 * Phase 3: MQTT announce discovery (no LAN RPC/WebSocket driver).
 * Publishes `announce` on shellies/command, collects announce payloads,
 * then optionally probes Shelly.GetStatus over MQTT RPC for switch count.
 */
export async function discoverShellyDevices(opts?: {
  timeoutMs?: number;
}): Promise<{ devices: DiscoveredShelly[]; mqttConnected: boolean }> {
  const mqttClient = client;
  if (!mqttClient?.connected) {
    return { devices: [], mqttConnected: false };
  }

  const timeoutMs = Math.min(15_000, Math.max(2_000, opts?.timeoutMs ?? 5_000));
  const found = new Map<
    string,
    Omit<
      DiscoveredShelly,
      "suggestedSwitchCount" | "suggestedModelId" | "switchCountProbed"
    >
  >();

  const collector: DiscoveryCollector = (topic, payload) => {
    if (
      topic === "shellies/announce" ||
      topic.endsWith("/announce") ||
      /\/announce$/i.test(topic)
    ) {
      const parsed = parseShellyAnnouncePayload(payload);
      if (parsed) found.set(parsed.topicPrefix, parsed);
      return;
    }
    // Online presence: shellyxxx/online → true
    const onlineMatch = /^([^/]+)\/online$/i.exec(topic);
    if (onlineMatch && /^(true|1|online)$/i.test(payload.trim())) {
      const prefix = onlineMatch[1]!;
      if (!found.has(prefix) && /^shelly/i.test(prefix)) {
        found.set(prefix, {
          topicPrefix: prefix,
          model: null,
          app: null,
          mac: null,
          gen: null,
          version: null,
          ip: null,
        });
      }
    }
  };

  discoveryCollectors.add(collector);
  try {
    await new Promise<void>((resolve) => {
      mqttClient.subscribe(
        ["shellies/announce", "shellies/#", "+/announce", `${DISCOVER_SRC}/rpc`],
        { qos: 0 },
        () => resolve()
      );
    });

    await new Promise<void>((resolve, reject) => {
      mqttClient.publish("shellies/command", "announce", { qos: 0 }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((r) => setTimeout(r, timeoutMs));

    // Probe switch counts in parallel via MQTT RPC GetStatus.
    const devices: DiscoveredShelly[] = await Promise.all(
      [...found.values()].map(async (base) => {
        const probed = await probeShellySwitchCountMqtt(base.topicPrefix, 2_000);
        if (probed != null) {
          return enrichDiscoveredShelly(base, {
            switchCount: probed,
            probed: true,
          });
        }
        return enrichDiscoveredShelly(base);
      })
    );

    devices.sort((a, b) => a.topicPrefix.localeCompare(b.topicPrefix));
    return { devices, mqttConnected: true };
  } finally {
    discoveryCollectors.delete(collector);
  }
}

function probeShellySwitchCountMqtt(
  topicPrefix: string,
  waitMs: number
): Promise<number | null> {
  const mqttClient = client;
  if (!mqttClient?.connected) return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (n: number | null) => {
      if (settled) return;
      settled = true;
      discoveryCollectors.delete(onRpc);
      resolve(n);
    };

    const onRpc: DiscoveryCollector = (topic, payload) => {
      if (topic !== `${DISCOVER_SRC}/rpc`) return;
      try {
        const msg = JSON.parse(payload) as {
          result?: unknown;
          src?: string;
        };
        // Only accept replies from the device we probed.
        if (msg.src && msg.src !== topicPrefix) return;
        const n = countSwitchesInStatusResult(msg.result);
        if (n != null) finish(n);
      } catch {
        /* ignore */
      }
    };

    discoveryCollectors.add(onRpc);
    const body = JSON.stringify({
      id: 1,
      src: DISCOVER_SRC,
      method: "Shelly.GetStatus",
    });
    mqttClient.publish(`${topicPrefix}/rpc`, body, { qos: 0 }, () => {
      /* fire and forget */
    });
    setTimeout(() => finish(null), waitMs);
  });
}
