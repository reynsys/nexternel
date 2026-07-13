export interface LiveReading {
  sensorId: string;
  name?: string;
  unit?: string | null;
  sensorType?: string;
  latest: number | null;
  updatedAt: string | null;
  isLive?: boolean;
  source?: string | null;
}

export function formatSensorValue(latest: number | null, unit?: string | null): string {
  if (latest === null || latest === undefined) return "—";
  const rounded = Number.isInteger(latest) ? String(latest) : latest.toFixed(1);
  return unit ? `${rounded} ${unit}` : rounded;
}

export function formatRelayValue(state: string | null | undefined): string {
  if (!state) return "Unknown";
  const on = state.toLowerCase() === "on" || state === "1" || state === "true";
  return on ? "ON" : "OFF";
}

export function formatAge(isoTime: string): string {
  const ageMs = Date.now() - new Date(isoTime).getTime();
  if (ageMs < 60_000) return "just now";
  const mins = Math.floor(ageMs / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

export function liveStatusText(reading: LiveReading | undefined): string {
  if (!reading || reading.latest === null) return "No data yet";
  if (reading.isLive) return "Live";
  if (reading.updatedAt) return `Updated ${formatAge(reading.updatedAt)}`;
  return "Stale reading";
}

export function humidityProgress(value: number | null): number {
  if (value === null) return 0;
  return Math.min(100, Math.max(0, value));
}

export function historyToChartPoints(history: { time: string; value: number }[]) {
  return history.map((p) => ({ value: p.value }));
}

export function historyTrendText(history: { value: number }[]): string | undefined {
  if (history.length < 2) return undefined;
  const first = history[0].value;
  const last = history[history.length - 1].value;
  if (first === 0) return undefined;
  const pct = ((last - first) / Math.abs(first)) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}% over 24h`;
}
