export function isReadingList(
  data: unknown
): data is { sensorId: string; updatedAt: string | null; isLive?: boolean }[] {
  return Array.isArray(data);
}
