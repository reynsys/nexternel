/**
 * Parse Shelly MQTT announce / GetDeviceInfo-like payloads (Phase 3 discovery).
 */

import {
  guessShellySwitchCount,
  shellyPresetIdForSwitchCount,
} from "./models.js";

export type DiscoveredShelly = {
  /** MQTT topic prefix (usually the device id). */
  topicPrefix: string;
  model: string | null;
  app: string | null;
  mac: string | null;
  gen: number | null;
  version: string | null;
  ip: string | null;
  /** Suggested switch channels (guessed or probed). */
  suggestedSwitchCount: number;
  suggestedModelId: string;
  /** True when we confirmed switch count via GetStatus over MQTT RPC. */
  switchCountProbed: boolean;
};

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Parse shellies/announce or {id}/announce JSON. */
export function parseShellyAnnouncePayload(
  payload: string
): Omit<DiscoveredShelly, "suggestedSwitchCount" | "suggestedModelId" | "switchCountProbed"> | null {
  const raw = payload.trim();
  if (!raw.startsWith("{")) return null;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const id = asString(obj.id) || asString(obj.topic_prefix);
    if (!id) return null;
    return {
      topicPrefix: id.replace(/^\/+|\/+$/g, ""),
      model: asString(obj.model),
      app: asString(obj.app),
      mac: asString(obj.mac),
      gen: asNumber(obj.gen),
      version: asString(obj.ver) || asString(obj.fw_id) || asString(obj.fw_ver),
      ip: asString(obj.ip) || asString(obj.wifi_ip),
    };
  } catch {
    return null;
  }
}

export function enrichDiscoveredShelly(
  base: Omit<
    DiscoveredShelly,
    "suggestedSwitchCount" | "suggestedModelId" | "switchCountProbed"
  >,
  opts?: { switchCount?: number; probed?: boolean }
): DiscoveredShelly {
  const suggestedSwitchCount =
    opts?.switchCount ??
    guessShellySwitchCount({ app: base.app, model: base.model });
  return {
    ...base,
    suggestedSwitchCount,
    suggestedModelId: shellyPresetIdForSwitchCount(suggestedSwitchCount),
    switchCountProbed: Boolean(opts?.probed),
  };
}

/** Count switch:N keys in a Shelly.GetStatus result object. */
export function countSwitchesInStatusResult(result: unknown): number | null {
  if (!result || typeof result !== "object") return null;
  let n = 0;
  for (const key of Object.keys(result as Record<string, unknown>)) {
    if (/^switch:\d+$/i.test(key)) n += 1;
  }
  return n > 0 ? n : null;
}
