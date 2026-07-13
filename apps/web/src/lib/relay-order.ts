/** Stable relay ordering — registration / ESPHome import order, not display name. */

export type RelayOrderMeta = {
  id: string;
  deviceId?: string;
  createdAt?: string | Date;
};

export const prismaRelayOrderBy = { createdAt: "asc" as const };

export const prismaRelayListOrderBy = [{ deviceId: "asc" as const }, prismaRelayOrderBy];

function relaySortKey(relay: RelayOrderMeta): number {
  if (!relay.createdAt) return 0;
  const t =
    relay.createdAt instanceof Date
      ? relay.createdAt.getTime()
      : new Date(relay.createdAt).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function compareRelaysStable(a: RelayOrderMeta, b: RelayOrderMeta): number {
  const byTime = relaySortKey(a) - relaySortKey(b);
  if (byTime !== 0) return byTime;
  return a.id.localeCompare(b.id);
}

/** Sort by registration time. `relayIds` filters which relays are included, not their order. */
export function orderRelaysStable<T extends RelayOrderMeta>(
  relays: T[],
  relayIds?: string[]
): T[] {
  const pool = relayIds?.length ? relays.filter((r) => relayIds.includes(r.id)) : relays;
  return [...pool].sort(compareRelaysStable);
}

export function relaysForDevice<T extends RelayOrderMeta & { deviceId: string }>(
  relays: T[],
  deviceId: string
): T[] {
  return orderRelaysStable(relays.filter((r) => r.deviceId === deviceId));
}

export function resolveDeviceRelayIds<T extends RelayOrderMeta & { deviceId: string }>(
  relays: T[],
  deviceId: string | undefined,
  configuredRelayIds?: string[]
): string[] {
  if (!deviceId) return [];
  const deviceRelays = relays.filter((r) => r.deviceId === deviceId);
  const ordered = orderRelaysStable(
    deviceRelays,
    configuredRelayIds?.length ? configuredRelayIds : undefined
  );
  return ordered.map((r) => r.id);
}
