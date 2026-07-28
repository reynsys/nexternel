import mqtt, { type MqttClient } from "mqtt";
import { config } from "../config.js";
import {
  listDevicePrefixes,
  listStateTopicBindings,
  getCapabilityById,
} from "../capabilities/store.js";
import { getLiveState, parseMqttPayload, setLiveState } from "./state-cache.js";
import { getPool } from "../db.js";
import { DEVICE_ONLINE_TIMEOUT_MS } from "../devices/presence.js";

let client: MqttClient | null = null;
let status: "disconnected" | "connecting" | "connected" | "error" = "disconnected";
let lastError: string | null = null;
let presenceTimer: ReturnType<typeof setInterval> | null = null;

/** state_topic → capability ids (usually one) */
const topicIndex = new Map<string, { capabilityId: string; kind: string }[]>();

/** Debounce device online touches (prefix → last ms) */
const lastOnlineTouch = new Map<string, number>();
let cachedPrefixes: string[] = [];

export function getMqttStatus() {
  return { status, lastError, broker: config.mqttBroker() };
}

async function rebuildTopicIndex() {
  topicIndex.clear();
  const bindings = await listStateTopicBindings();
  for (const b of bindings) {
    const list = topicIndex.get(b.state_topic) ?? [];
    list.push({ capabilityId: b.capability_id, kind: b.kind });
    topicIndex.set(b.state_topic, list);
  }
  cachedPrefixes = await listDevicePrefixes();
}

function touchDeviceOnlineFromTopic(topic: string) {
  const prefix = cachedPrefixes.find(
    (p) => topic === p || topic.startsWith(`${p}/`)
  );
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

function handleMessage(topic: string, payloadBuf: Buffer, packet: { retain?: boolean }) {
  touchDeviceOnlineFromTopic(topic);
  const payload = payloadBuf.toString("utf8");
  const entries = topicIndex.get(topic);
  if (!entries?.length) return;
  for (const { capabilityId, kind } of entries) {
    const value = parseMqttPayload(kind, payload);
    setLiveState(capabilityId, value, {
      quality: "good",
      retained: Boolean(packet.retain),
    });
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
        [DEVICE_ONLINE_TIMEOUT_MS / 1000]
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

  const payload = next ? "ON" : "OFF";
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

  // Optimistic update; state topic will confirm
  setLiveState(capabilityId, next, { quality: "good" });

  if (cap.source_type === "relay") {
    await getPool().query(
      `UPDATE relays SET last_state = $1, updated_at = NOW() WHERE id = $2`,
      [payload, cap.source_id]
    );
  }

  return { value: next };
}

export function stopTelemetry() {
  client?.end(true);
  client = null;
  status = "disconnected";
}
