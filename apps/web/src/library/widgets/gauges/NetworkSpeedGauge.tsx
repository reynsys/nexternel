"use client";

import { cn } from "@/lib/utils";
import {
  clamp,
  describeArc,
  polarToCartesian,
  valueToAngle,
  type GaugeZone,
} from "./gauge-utils";

const MIN = 0;
const MAX = 500;
const START = -125;
const END = 125;
/** Sparse ticks — readable in narrow 2-column cells */
const TICKS = [0, 250, 500];

const SPEED_ZONES: GaugeZone[] = [
  { from: 0, to: 100, color: "#ef4444" },
  { from: 100, to: 300, color: "#eab308" },
  { from: 300, to: 500, color: "#22c55e" },
];

function formatMbps(value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (value < 10) return value.toFixed(1);
  return String(Math.round(value));
}

/**
 * Semicircle speed dial — SVG arc/needle only; numeric readout is HTML below
 * so values never clip inside a tight viewBox.
 */
export function NetworkSpeedGauge({
  label,
  valueMbps,
  className,
}: {
  label: string;
  valueMbps: number | null;
  className?: string;
}) {
  const cx = 100;
  const cy = 78;
  const radius = 54;
  const safe = valueMbps === null ? MIN : clamp(valueMbps, MIN, MAX);
  const needleAngle = valueToAngle(safe, MIN, MAX, START, END);
  const needleTip = polarToCartesian(cx, cy, radius - 8, needleAngle);
  const displayValue = formatMbps(valueMbps);

  return (
    <div
      className={cn(
        "speed-test-gauge flex h-full min-h-0 w-full min-w-0 flex-col items-stretch",
        className
      )}
    >
      <p className="speed-test-gauge-label shrink-0 truncate text-center text-[8px] font-medium leading-none text-muted-foreground">
        {label}
      </p>

      <div className="speed-test-gauge-dial relative min-h-0 w-full flex-1">
        <svg
          viewBox="0 0 200 88"
          className="h-full w-full"
          preserveAspectRatio="xMidYMax meet"
          aria-hidden
        >
          {SPEED_ZONES.map((zone) => {
            const a0 = valueToAngle(zone.from, MIN, MAX, START, END);
            const a1 = valueToAngle(zone.to, MIN, MAX, START, END);
            return (
              <path
                key={`${zone.from}-${zone.to}`}
                d={describeArc(cx, cy, radius, a0, a1)}
                fill="none"
                stroke={zone.color}
                strokeWidth={10}
                strokeLinecap="butt"
                opacity={0.92}
              />
            );
          })}

          {TICKS.map((tick) => {
            const angle = valueToAngle(tick, MIN, MAX, START, END);
            const inner = polarToCartesian(cx, cy, radius + 1, angle);
            const outer = polarToCartesian(cx, cy, radius + 7, angle);
            const labelPt = polarToCartesian(cx, cy, radius + 14, angle);
            return (
              <g key={tick} className="speed-test-gauge-tick">
                <line
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="var(--muted-foreground)"
                  strokeWidth={1}
                  opacity={0.5}
                />
                <text
                  x={labelPt.x}
                  y={labelPt.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="speed-test-gauge-tick-label fill-muted-foreground"
                  fontSize={6.5}
                >
                  {tick}
                </text>
              </g>
            );
          })}

          <circle cx={cx} cy={cy} r={4} fill="var(--card)" stroke="var(--border)" strokeWidth={1} />
          <line
            x1={cx}
            y1={cy}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke="var(--foreground)"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r={2.25} fill="var(--foreground)" />
        </svg>
      </div>

      <div className="speed-test-gauge-readout shrink-0 text-center leading-none">
        <span className="speed-test-gauge-value font-bold tabular-nums text-foreground">
          {displayValue}
        </span>
        <span className="speed-test-gauge-unit ml-0.5 text-muted-foreground">Mbps</span>
      </div>
    </div>
  );
}
