"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clamp,
  describeArc,
  formatGaugeValue,
  polarToCartesian,
  valueToAngle,
  type GaugeZone,
} from "./gauge-utils";

const START = -120;
const END = 120;

export type SemicircleNeedleGaugeProps = {
  title: string;
  subtitle?: string;
  value: number | null;
  min: number;
  max: number;
  unit?: string | null;
  zones: GaugeZone[];
  statusText?: string;
  icon?: LucideIcon;
  className?: string;
};

export function SemicircleNeedleGauge({
  title,
  subtitle,
  value,
  min,
  max,
  unit,
  zones,
  statusText,
  icon: Icon,
  className,
}: SemicircleNeedleGaugeProps) {
  const cx = 100;
  const cy = 100;
  const radius = 72;
  const safe = value === null ? min : clamp(value, min, max);
  const needleAngle = valueToAngle(safe, min, max, START, END);
  const needleTip = polarToCartesian(cx, cy, radius - 8, needleAngle);
  const ticks = 5;
  const displayValue = formatGaugeValue(value, unit);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden text-left",
        className
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-2 px-1 pt-0.5">
        <div className="min-w-0">
          <p className="widget-fit-title truncate font-semibold leading-tight">{title}</p>
          {subtitle ? (
            <p className="truncate text-[10px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {Icon ? (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/60">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        ) : null}
      </div>

      <div className="gauge-dial-wrap relative min-h-[5.5rem] w-full flex-1">
        <svg
          viewBox="0 0 200 148"
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          {zones.map((zone) => {
            const a0 = valueToAngle(zone.from, min, max, START, END);
            const a1 = valueToAngle(zone.to, min, max, START, END);
            return (
              <path
                key={`${zone.from}-${zone.to}`}
                d={describeArc(cx, cy, radius, a0, a1)}
                fill="none"
                stroke={zone.color}
                strokeWidth={14}
                strokeLinecap="butt"
                opacity={0.85}
              />
            );
          })}

          <path
            d={describeArc(cx, cy, radius, START, END)}
            fill="none"
            stroke="var(--border)"
            strokeWidth={1}
            opacity={0.5}
          />

          {Array.from({ length: ticks + 1 }, (_, i) => {
            const t = i / ticks;
            const angle = START + t * (END - START);
            const outer = polarToCartesian(cx, cy, radius + 4, angle);
            const inner = polarToCartesian(cx, cy, radius - 18, angle);
            const labelVal = min + t * (max - min);
            const labelPt = polarToCartesian(cx, cy, radius + 14, angle);
            return (
              <g key={i}>
                <line
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="var(--muted-foreground)"
                  strokeWidth={1}
                  opacity={0.6}
                />
                <text
                  x={labelPt.x}
                  y={labelPt.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-muted-foreground"
                  fontSize={8}
                >
                  {Number.isInteger(labelVal) ? labelVal : labelVal.toFixed(0)}
                </text>
              </g>
            );
          })}

          <circle cx={cx} cy={cy} r={5} fill="var(--card)" stroke="var(--border)" strokeWidth={1} />
          <line
            x1={cx}
            y1={cy}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke="var(--foreground)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r={3} fill="var(--foreground)" />

          <text
            x={cx}
            y={cy + 36}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground"
            fontSize={18}
            fontWeight={700}
          >
            {displayValue}
          </text>
        </svg>
      </div>

      {statusText ? (
        <p className="shrink-0 truncate px-1 pb-0.5 text-center text-[10px] text-muted-foreground">
          {statusText}
        </p>
      ) : null}
    </div>
  );
}
