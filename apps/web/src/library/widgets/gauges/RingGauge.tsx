"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clamp,
  formatGaugeValue,
  ringStrokeColor,
  type GaugeZone,
} from "./gauge-utils";

export type RingGaugeProps = {
  title: string;
  subtitle?: string;
  value: number | null;
  min: number;
  max: number;
  unit?: string | null;
  zones?: GaugeZone[];
  statusText?: string;
  icon?: LucideIcon;
  className?: string;
};

export function RingGauge({
  title,
  subtitle,
  value,
  min,
  max,
  unit,
  statusText,
  icon: Icon,
  className,
}: RingGaugeProps) {
  const cx = 50;
  const cy = 50;
  const radius = 38;
  const stroke = 9;
  const circumference = 2 * Math.PI * radius;
  const safe = value === null ? min : clamp(value, min, max);
  const ratio = max > min ? (safe - min) / (max - min) : 0;
  const dash = circumference * ratio;
  const strokeColor =
    value !== null ? ringStrokeColor(safe, min, max) : "var(--muted-foreground)";
  const valueText =
    value !== null ? (Number.isInteger(safe) ? String(safe) : safe.toFixed(1)) : "—";

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

      <div className="gauge-dial-wrap min-h-[5.5rem] w-full flex-1">
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={stroke}
            opacity={0.35}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: "stroke-dasharray 0.4s ease, stroke 0.3s ease" }}
          />
          <text
            x={cx}
            y={cy - 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground"
            fontSize={16}
            fontWeight={700}
          >
            {valueText}
          </text>
          {unit ? (
            <text
              x={cx}
              y={cy + 12}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground"
              fontSize={9}
            >
              {unit}
            </text>
          ) : null}
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

/** Solid arc ring (fuel-gauge style) — second variant for catalog. */
export function SolidArcGauge({
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
}: RingGaugeProps) {
  const cx = 100;
  const cy = 88;
  const radius = 70;
  const safe = value === null ? min : clamp(value, min, max);
  const startAngle = -180;
  const endAngle = 0;
  const valueAngle =
    max > min ? startAngle + ((safe - min) / (max - min)) * (endAngle - startAngle) : startAngle;

  const zoneList = zones ?? [
    { from: min, to: max * 0.6, color: "#22c55e" },
    { from: max * 0.6, to: max * 0.85, color: "#eab308" },
    { from: max * 0.85, to: max, color: "#ef4444" },
  ];

  function arcPath(r: number, a0: number, a1: number) {
    const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
    const x0 = cx + r * Math.cos(rad(a0));
    const y0 = cy + r * Math.sin(rad(a0));
    const x1 = cx + r * Math.cos(rad(a1));
    const y1 = cy + r * Math.sin(rad(a1));
    const sweep = a1 - a0;
    const large = Math.abs(sweep) > 180 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  }

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

      <div className="gauge-dial-wrap min-h-[5rem] w-full flex-1">
        <svg viewBox="0 0 200 100" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <path
            d={arcPath(radius, startAngle, endAngle)}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={16}
            strokeLinecap="round"
            opacity={0.3}
          />
          {zoneList.map((z) => {
            const a0 =
              startAngle + ((z.from - min) / (max - min)) * (endAngle - startAngle);
            const a1 =
              startAngle + ((z.to - min) / (max - min)) * (endAngle - startAngle);
            const clipEnd = Math.min(a1, valueAngle);
            if (clipEnd <= a0) return null;
            return (
              <path
                key={`${z.from}-${z.to}`}
                d={arcPath(radius, a0, clipEnd)}
                fill="none"
                stroke={z.color}
                strokeWidth={16}
                strokeLinecap="butt"
              />
            );
          })}
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground"
            fontSize={16}
            fontWeight={700}
          >
            {formatGaugeValue(value, unit)}
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
