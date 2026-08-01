/** How long after last MQTT traffic a device without LWT status may stay online. */
export const DEVICE_ONLINE_TIMEOUT_MS = 1_800_000; // 30 minutes

/** Live capability updates imply the parent device is reachable (e.g. ESPHome sensors). */
export const LIVE_CAPABILITY_PRESENCE_MS = 120_000; // 2 minutes

export function isDeviceSeenRecently(lastSeenAt: Date | string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  const t = typeof lastSeenAt === "string" ? Date.parse(lastSeenAt) : lastSeenAt.getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < DEVICE_ONLINE_TIMEOUT_MS;
}
