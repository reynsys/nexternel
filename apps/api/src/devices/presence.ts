/** How long after last MQTT traffic a device is still considered online. */
export const DEVICE_ONLINE_TIMEOUT_MS = 90_000;

export function isDeviceSeenRecently(lastSeenAt: Date | string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  const t = typeof lastSeenAt === "string" ? Date.parse(lastSeenAt) : lastSeenAt.getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < DEVICE_ONLINE_TIMEOUT_MS;
}
