/**
 * Shelly Gen2/Gen3 MQTT topic helpers (Phase 1).
 * Control interface: {prefix}/command/switch:N  and  {prefix}/status/switch:N
 */

export function normalizeShellyTopicPrefix(prefix: string): string {
  return prefix.trim().replace(/^\/+|\/+$/g, "");
}

export function buildShellySwitchTopics(
  topicPrefix: string,
  channel = 0
): { stateTopic: string; commandTopic: string; entityId: string; slug: string } {
  const prefix = normalizeShellyTopicPrefix(topicPrefix);
  if (!prefix) throw new Error("Shelly MQTT topic prefix is required");
  const ch = Number.isFinite(channel) && channel >= 0 ? Math.floor(channel) : 0;
  const entityId = `switch:${ch}`;
  return {
    entityId,
    slug: `switch_${ch}`,
    stateTopic: `${prefix}/status/switch:${ch}`,
    commandTopic: `${prefix}/command/switch:${ch}`,
  };
}

export type ShellySwitchSuggestion = {
  name: string;
  slug: string;
  esphomeEntityId: string;
  mqttCommandTopic: string;
  mqttStateTopic: string;
  gpioPin?: number;
};

/** One-channel switch device suggestion (legacy). Prefer suggestShellyDevice. */
export function suggestShellySwitch(opts: {
  name: string;
  topicPrefix: string;
  channel?: number;
}): {
  name: string;
  mqttTopicPrefix: string;
  firmwareType: "shelly";
  relays: ShellySwitchSuggestion[];
} {
  const name = opts.name.trim();
  if (!name) throw new Error("Name is required");
  const mqttTopicPrefix = normalizeShellyTopicPrefix(opts.topicPrefix);
  const ch = opts.channel ?? 0;
  const topics = buildShellySwitchTopics(mqttTopicPrefix, ch);
  return {
    name,
    mqttTopicPrefix,
    firmwareType: "shelly",
    relays: [
      {
        name: ch > 0 ? `${name} ${ch}` : name,
        slug: topics.slug,
        esphomeEntityId: topics.entityId,
        mqttCommandTopic: topics.commandTopic,
        mqttStateTopic: topics.stateTopic,
      },
    ],
  };
}

/** True when MQTT topics look like Shelly Gen2/Gen3 control interface. */
export function looksLikeShellyCommandTopic(topic: string | null | undefined): boolean {
  if (!topic) return false;
  return /\/command\/switch:\d+$/i.test(topic);
}
