/** Shared math for SVG gauge widgets (no external chart libs). */

export type GaugeZone = {
  from: number;
  to: number;
  color: string;
};

const DEG = Math.PI / 180;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number
): { x: number; y: number } {
  const rad = (angleDeg - 90) * DEG;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

/** SVG arc path from startAngle to endAngle (degrees, 0 = top, clockwise). */
export function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const sweep = endAngle - startAngle;
  const largeArc = Math.abs(sweep) > 180 ? 1 : 0;
  const sweepFlag = sweep > 0 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} ${sweepFlag} ${end.x} ${end.y}`;
}

export function valueToAngle(
  value: number,
  min: number,
  max: number,
  startAngle: number,
  endAngle: number
): number {
  if (max <= min) return startAngle;
  const t = clamp(value, min, max);
  const ratio = (t - min) / (max - min);
  return startAngle + ratio * (endAngle - startAngle);
}

export function formatGaugeValue(value: number | null, unit?: string | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return unit ? `${rounded}${unit.startsWith("%") || unit.startsWith("°") ? "" : " "}${unit}` : rounded;
}

const TEMP_ZONES: GaugeZone[] = [
  { from: 0, to: 18, color: "#3b82f6" },
  { from: 18, to: 24, color: "#22c55e" },
  { from: 24, to: 30, color: "#eab308" },
  { from: 30, to: 50, color: "#ef4444" },
];

const PERCENT_ZONES: GaugeZone[] = [
  { from: 0, to: 40, color: "#22c55e" },
  { from: 40, to: 70, color: "#eab308" },
  { from: 70, to: 100, color: "#ef4444" },
];

const GENERIC_ZONES: GaugeZone[] = [
  { from: 0, to: 60, color: "#22c55e" },
  { from: 60, to: 85, color: "#eab308" },
  { from: 85, to: 100, color: "#ef4444" },
];

export function gaugeRangeForSensor(
  sensorType: string,
  unit?: string | null,
  latest?: number | null
): { min: number; max: number; zones: GaugeZone[] } {
  const t = sensorType.toLowerCase();
  const u = (unit || "").toLowerCase();

  if (t.includes("temp") || u.includes("°c") || u.includes("°f")) {
    return { min: 0, max: 40, zones: TEMP_ZONES };
  }
  if (t.includes("humid") || u === "%" || u.includes("percent")) {
    return { min: 0, max: 100, zones: PERCENT_ZONES };
  }

  if (latest !== null && latest !== undefined && latest <= 100 && latest >= 0) {
    return { min: 0, max: 100, zones: PERCENT_ZONES };
  }

  const abs = Math.max(10, Math.ceil(Math.abs(latest ?? 50) * 1.25));
  return {
    min: 0,
    max: abs,
    zones: [
      { from: 0, to: abs * 0.6, color: "#22c55e" },
      { from: abs * 0.6, to: abs * 0.85, color: "#eab308" },
      { from: abs * 0.85, to: abs, color: "#ef4444" },
    ],
  };
}

export function needleColorForValue(
  value: number,
  zones: GaugeZone[],
  fallback = "var(--foreground)"
): string {
  for (const z of zones) {
    if (value >= z.from && value <= z.to) return z.color;
  }
  return zones[zones.length - 1]?.color ?? fallback;
}

export function ringStrokeColor(value: number, min: number, max: number): string {
  const ratio = max > min ? (clamp(value, min, max) - min) / (max - min) : 0;
  if (ratio < 0.4) return "#22c55e";
  if (ratio < 0.7) return "#eab308";
  return "#ef4444";
}
