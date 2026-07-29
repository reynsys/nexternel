import {
  buildShellySwitchTopics,
  normalizeShellyTopicPrefix,
  type ShellySwitchSuggestion,
} from "./topics.js";
import {
  getShellyModelPreset,
  guessShellySwitchCount,
  shellyPresetIdForSwitchCount,
} from "./models.js";

export type { ShellySwitchSuggestion };

/** Build relays for a multi-channel Shelly (Phase 3). */
export function buildShellyRelays(opts: {
  deviceName: string;
  topicPrefix: string;
  switchCount: number;
  /** Optional per-channel names; missing slots get "Name" / "Name 2"… */
  channelNames?: (string | null | undefined)[];
}): ShellySwitchSuggestion[] {
  const prefix = normalizeShellyTopicPrefix(opts.topicPrefix);
  const deviceName = opts.deviceName.trim() || "Shelly";
  const count = Math.min(8, Math.max(1, Math.floor(opts.switchCount) || 1));
  const relays: ShellySwitchSuggestion[] = [];

  for (let ch = 0; ch < count; ch++) {
    const topics = buildShellySwitchTopics(prefix, ch);
    const custom = opts.channelNames?.[ch]?.trim();
    const name =
      custom ||
      (count === 1 ? deviceName : ch === 0 ? deviceName : `${deviceName} ${ch + 1}`);
    relays.push({
      name,
      slug: topics.slug,
      esphomeEntityId: topics.entityId,
      mqttCommandTopic: topics.commandTopic,
      mqttStateTopic: topics.stateTopic,
    });
  }
  return relays;
}

export function resolveShellySwitchCount(opts: {
  shellyModelId?: string | null;
  shellySwitchCount?: number | null;
  shellyChannel?: number | null;
}): number {
  if (
    typeof opts.shellySwitchCount === "number" &&
    Number.isFinite(opts.shellySwitchCount) &&
    opts.shellySwitchCount >= 1
  ) {
    return Math.min(8, Math.floor(opts.shellySwitchCount));
  }
  if (opts.shellyModelId) {
    return getShellyModelPreset(opts.shellyModelId).switchCount;
  }
  // Legacy Phase 1: single channel index (usually 0) → one relay on that channel only.
  // Multi-model create should pass shellySwitchCount / shellyModelId instead.
  if (
    typeof opts.shellyChannel === "number" &&
    Number.isFinite(opts.shellyChannel) &&
    opts.shellyChannel > 0
  ) {
    return 1;
  }
  return 1;
}

export function suggestShellyDevice(opts: {
  name: string;
  topicPrefix: string;
  shellyModelId?: string | null;
  shellySwitchCount?: number | null;
  channelNames?: (string | null | undefined)[];
}): {
  name: string;
  mqttTopicPrefix: string;
  firmwareType: "shelly";
  shellyModelId: string;
  switchCount: number;
  relays: ShellySwitchSuggestion[];
} {
  const name = opts.name.trim();
  if (!name) throw new Error("Name is required");
  const mqttTopicPrefix = normalizeShellyTopicPrefix(opts.topicPrefix);
  const switchCount = resolveShellySwitchCount({
    shellyModelId: opts.shellyModelId,
    shellySwitchCount: opts.shellySwitchCount,
  });
  return {
    name,
    mqttTopicPrefix,
    firmwareType: "shelly",
    shellyModelId: opts.shellyModelId || shellyPresetIdForSwitchCount(switchCount),
    switchCount,
    relays: buildShellyRelays({
      deviceName: name,
      topicPrefix: mqttTopicPrefix,
      switchCount,
      channelNames: opts.channelNames,
    }),
  };
}

export { guessShellySwitchCount, shellyPresetIdForSwitchCount };
