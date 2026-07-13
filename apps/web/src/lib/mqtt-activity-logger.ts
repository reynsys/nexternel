import type { MqttClient } from "mqtt";
import { logActivity } from "@/lib/activity-log";

let loggerStarted = false;
const lastRelayState = new Map<string, string>();

/** Subscribe to relay state topics and log changes (physical + UI feedback). */
export function startMqttActivityLogger(client: MqttClient) {
  if (loggerStarted) return;
  loggerStarted = true;

  const prefix = (process.env.MQTT_TOPIC_PREFIX || "damnhome").replace(/\/$/, "");
  const filter = `${prefix}/#`;

  client.subscribe(filter, { qos: 0 }, (err) => {
    if (err) console.error("[mqtt-activity-logger] subscribe failed", err);
  });

  client.on("message", (topic, payload, packet) => {
    if (!topic.startsWith(`${prefix}/`)) return;
    if (!topic.includes("/switch/") || !topic.endsWith("/state")) return;

    const state = payload.toString().trim();
    if (state !== "ON" && state !== "OFF") return;

    const prev = lastRelayState.get(topic);
    if (prev === state) return;
    lastRelayState.set(topic, state);

    const name = topic
      .replace(`${prefix}/`, "")
      .replace(/\/switch\/.+\/state$/, "")
      .replace(/\//g, " · ");

    void logActivity(
      "mqtt",
      `Relay state ${name || topic}: ${state}${packet.retain ? " (retained)" : ""}`,
      { topic, state, retained: !!packet.retain }
    );
  });
}
