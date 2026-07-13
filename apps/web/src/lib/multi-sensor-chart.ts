export interface HistoryPoint {
  time: string;
  value: number;
}

export interface SensorSeries {
  id: string;
  key: string;
  label: string;
  unit: string | null;
  color: string;
  points: HistoryPoint[];
}

/** Distinct colours for common sensor types (readable on dark dashboards). */
export const SENSOR_CHART_COLORS = {
  temperature: "#7ec8e3",
  humidity: "#fdba74",
  pressure: "#e2e8f0",
  default: "#a78bfa",
} as const;

const FALLBACK_COLORS = [
  "#7ec8e3",
  "#fdba74",
  "#c4b5fd",
  "#86efac",
  "#fca5a5",
];

export function seriesColor(index: number): string {
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

/** Pick a line colour from sensor type / name (e.g. temp → blue, humidity → orange). */
export function seriesColorForSensor(
  sensorType: string,
  name: string,
  index: number
): string {
  const key = `${sensorType} ${name}`.toLowerCase();
  if (key.includes("temp")) return SENSOR_CHART_COLORS.temperature;
  if (key.includes("humid")) return SENSOR_CHART_COLORS.humidity;
  if (key.includes("press")) return SENSOR_CHART_COLORS.pressure;
  return seriesColor(index);
}

/** Merge per-sensor histories into one row per timestamp for Recharts. */
export function mergeSensorHistories(series: SensorSeries[]) {
  const byTime = new Map<number, Record<string, string | number>>();

  for (const s of series) {
    for (const p of s.points) {
      const t = new Date(p.time).getTime();
      if (Number.isNaN(t)) continue;
      if (!byTime.has(t)) {
        byTime.set(t, { time: t });
      }
      byTime.get(t)![s.key] = p.value;
    }
  }

  return Array.from(byTime.values()).sort((a, b) => Number(a.time) - Number(b.time));
}

export function uniqueUnits(series: SensorSeries[]): string[] {
  const seen = new Set<string>();
  const units: string[] = [];
  for (const s of series) {
    const u = s.unit || s.label;
    if (!seen.has(u)) {
      seen.add(u);
      units.push(u);
    }
  }
  return units;
}

export function yAxisIdForUnit(unit: string, units: string[]): string {
  const index = units.indexOf(unit);
  if (index <= 0) return "y-left";
  if (index === 1) return "y-right";
  return `y-extra-${index}`;
}
