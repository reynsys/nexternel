import mqtt from "mqtt";
import { startMqttActivityLogger } from "@/lib/mqtt-activity-logger";

let client: mqtt.MqttClient | null = null;

function getClient(): Promise<mqtt.MqttClient> {
  return new Promise((resolve, reject) => {
    if (client?.connected) {
      resolve(client);
      return;
    }

    const broker = process.env.MQTT_BROKER || "mqtt://mosquitto:1883";
    const username = process.env.MQTT_USERNAME;
    const password = process.env.MQTT_PASSWORD;

    client = mqtt.connect(broker, {
      username,
      password,
      clientId: `damnhome-web-${Date.now()}`,
      reconnectPeriod: 5000,
    });

    client.on("connect", () => {
      startMqttActivityLogger(client!);
      resolve(client!);
    });
    client.on("error", reject);
  });
}

export async function publishRelayCommand(
  commandTopic: string,
  state: "ON" | "OFF"
): Promise<void> {
  const mqttClient = await getClient();
  return new Promise((resolve, reject) => {
    mqttClient.publish(commandTopic, state, { qos: 1 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/** Subscribe to all topics under a prefix and collect last payload per topic. */
export async function probeMqttPrefix(
  prefix: string,
  timeoutMs = 3500
): Promise<Map<string, string>> {
  const topics = new Map<string, string>();
  const base = prefix.replace(/\/+$/, "");
  if (!base) return topics;

  const mqttClient = await getClient();
  const filter = `${base}/#`;

  return new Promise((resolve) => {
    const onMessage = (topic: string, payload: Buffer) => {
      topics.set(topic, payload.toString());
    };

    const finish = () => {
      mqttClient.removeListener("message", onMessage);
      mqttClient.unsubscribe(filter);
      resolve(topics);
    };

    mqttClient.on("message", onMessage);
    mqttClient.subscribe(filter, { qos: 0 }, () => {
      setTimeout(finish, timeoutMs);
    });
  });
}

export function discoverSwitchEntitiesFromProbe(
  prefix: string,
  probe: Map<string, string>
): { entityId: string; stateTopic: string; state: string | null }[] {
  const base = prefix.replace(/\/+$/, "");
  const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/switch/([^/]+)/state$`);
  const found: { entityId: string; stateTopic: string; state: string | null }[] = [];

  for (const [topic, payload] of probe) {
    const m = re.exec(topic);
    if (!m) continue;
    const raw = payload.trim().toUpperCase();
    found.push({
      entityId: m[1],
      stateTopic: topic,
      state: raw === "ON" || raw === "OFF" ? raw : null,
    });
  }

  found.sort((a, b) => a.entityId.localeCompare(b.entityId));
  return found;
}

export async function getRelayState(stateTopic: string): Promise<string | null> {
  const mqttClient = await getClient();
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      mqttClient.unsubscribe(stateTopic);
      resolve(null);
    }, 3000);

    mqttClient.subscribe(stateTopic, { qos: 0 }, () => {
      mqttClient.once("message", (topic, payload) => {
        if (topic === stateTopic) {
          clearTimeout(timeout);
          mqttClient.unsubscribe(stateTopic);
          resolve(payload.toString());
        }
      });
    });
  });
}

export interface MqttRelayReading {
  state: "ON" | "OFF" | null;
  receivedAt: string | null;
  retained: boolean;
}

/** Read ON/OFF from relay state topics (retained state counts as reachable). */
export async function getMqttRelayStates(
  topics: string[]
): Promise<Map<string, MqttRelayReading>> {
  const results = new Map<string, MqttRelayReading>();
  if (topics.length === 0) return results;

  const mqttClient = await getClient();
  const uniqueTopics = Array.from(new Set(topics));

  return new Promise((resolve) => {
    const finish = () => {
      mqttClient.removeListener("message", onMessage);
      uniqueTopics.forEach((t) => mqttClient.unsubscribe(t));
      resolve(results);
    };

    const onMessage = (topic: string, payload: Buffer, packet: mqtt.IPublishPacket) => {
      if (!uniqueTopics.includes(topic)) return;
      const raw = payload.toString().trim().toUpperCase();
      const state = raw === "ON" || raw === "OFF" ? raw : null;
      if (!state) return;

      const retained = !!packet.retain;
      const entry: MqttRelayReading = {
        state,
        receivedAt: retained ? null : new Date().toISOString(),
        retained,
      };

      const existing = results.get(topic);
      if (!existing || (!retained && existing.retained)) {
        results.set(topic, entry);
      }
    };

    mqttClient.on("message", onMessage);
    mqttClient.subscribe(uniqueTopics, { qos: 0 }, () => {
      setTimeout(finish, 2500);
    });
  });
}

export interface MqttSensorReading {  value: number;
  /** Set only when a non-retained message arrives during this read */
  receivedAt: string | null;
  retained: boolean;
}

/** Read values from MQTT state topics. Retained (last-known) messages are not treated as live. */
export async function getMqttSensorValues(
  topics: string[]
): Promise<Map<string, MqttSensorReading>> {
  const results = new Map<string, MqttSensorReading>();
  if (topics.length === 0) return results;

  const mqttClient = await getClient();
  const uniqueTopics = Array.from(new Set(topics));

  return new Promise((resolve) => {
    const finish = () => {
      mqttClient.removeListener("message", onMessage);
      uniqueTopics.forEach((t) => mqttClient.unsubscribe(t));
      resolve(results);
    };

    const onMessage = (topic: string, payload: Buffer, packet: mqtt.IPublishPacket) => {
      if (!uniqueTopics.includes(topic)) return;
      const value = parseFloat(payload.toString());
      if (Number.isNaN(value)) return;

      const retained = !!packet.retain;
      const entry: MqttSensorReading = {
        value,
        receivedAt: retained ? null : new Date().toISOString(),
        retained,
      };

      const existing = results.get(topic);
      // Prefer a live (non-retained) reading over a retained one
      if (!existing || (!retained && existing.retained)) {
        results.set(topic, entry);
      }
    };

    mqttClient.on("message", onMessage);
    mqttClient.subscribe(uniqueTopics, { qos: 0 }, () => {
      setTimeout(finish, 2500);
    });
  });
}
