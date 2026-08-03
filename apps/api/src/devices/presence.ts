/** No MQTT traffic (non-retained) for this long → device offline. */
export const DEVICE_ONLINE_TIMEOUT_MS = 180_000; // 3 minutes

/** Live sensor reading older than this → quality stale (no dashboard value). */
export const LIVE_CAPABILITY_PRESENCE_MS = 180_000;

export function isDeviceSeenRecently(lastSeenAt: Date | string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  const t = typeof lastSeenAt === "string" ? Date.parse(lastSeenAt) : lastSeenAt.getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < DEVICE_ONLINE_TIMEOUT_MS;
}
