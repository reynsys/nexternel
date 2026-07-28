/**
 * Remap MQTT topic root segment: damnhome/garden-relays → nexternel/garden-relays
 * (and the same for full sensor/relay topics).
 */
export function remapTopicRoot(topic: string, newRoot: string): string {
  const root = newRoot.trim().replace(/^\/+|\/+$/g, "");
  const t = topic.trim();
  if (!root || !t) return t;
  const slash = t.indexOf("/");
  if (slash === -1) return root;
  return `${root}${t.slice(slash)}`;
}

export function applyTopicRootToPayload<
  T extends {
    devices: {
      mqttTopicPrefix: string;
      sensors: { mqttStateTopic: string }[];
      relays: { mqttStateTopic: string; mqttCommandTopic: string }[];
    }[];
  },
>(payload: T, newRoot: string): T {
  const root = newRoot.trim().replace(/^\/+|\/+$/g, "");
  if (!root) return payload;

  return {
    ...payload,
    devices: payload.devices.map((d) => ({
      ...d,
      mqttTopicPrefix: remapTopicRoot(d.mqttTopicPrefix, root),
      sensors: d.sensors.map((s) => ({
        ...s,
        mqttStateTopic: remapTopicRoot(s.mqttStateTopic, root),
      })),
      relays: d.relays.map((r) => ({
        ...r,
        mqttStateTopic: remapTopicRoot(r.mqttStateTopic, root),
        mqttCommandTopic: remapTopicRoot(r.mqttCommandTopic, root),
      })),
    })),
  };
}
