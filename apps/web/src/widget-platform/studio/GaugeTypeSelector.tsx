"use client";

import type { GaugeTypeId } from "@/widget-platform/types";
import { cn } from "@/lib/utils";

const TYPES: { id: GaugeTypeId; label: string }[] = [
  { id: "semicircle", label: "Semicircle" },
  { id: "radial", label: "Radial" },
  { id: "grafana", label: "Grafana" },
];

const C1 = "#5BE12C";
const C2 = "#F5CD19";
const C3 = "#EA4228";

/** Shared viewBox — all thumbnails same footprint. */
const VB = "0 0 64 40";

function MiniGaugeIcon({ type }: { type: GaugeTypeId }) {
  if (type === "radial") {
    const cx = 32;
    const cy = 22;
    const r = 14;
    return (
      <svg viewBox={VB} className="gauge-type-icon" aria-hidden preserveAspectRatio="xMidYMid meet">
        <path
          d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx + r * 0.866} ${cy + r * 0.5}`}
          fill="none"
          stroke={C1}
          strokeWidth={5}
          strokeLinecap="butt"
          opacity={0.92}
        />
        <path
          d={`M ${cx + r * 0.866} ${cy + r * 0.5} A ${r} ${r} 0 0 1 ${cx - r * 0.866} ${cy + r * 0.5}`}
          fill="none"
          stroke={C2}
          strokeWidth={5}
          strokeLinecap="butt"
          opacity={0.92}
        />
        <path
          d={`M ${cx - r * 0.866} ${cy + r * 0.5} A ${r} ${r} 0 0 1 ${cx} ${cy - r}`}
          fill="none"
          stroke={C3}
          strokeWidth={5}
          strokeLinecap="butt"
          opacity={0.92}
        />
        <line x1={cx} y1={cy} x2={cx} y2={cy - r + 3} stroke="#e2e8f0" strokeWidth={2} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={2.5} fill="#fff" />
      </svg>
    );
  }

  if (type === "grafana") {
    return (
      <svg viewBox={VB} className="gauge-type-icon" aria-hidden preserveAspectRatio="xMidYMid meet">
        <path d="M 10 34 A 22 22 0 0 1 54 34" fill="none" stroke={C1} strokeWidth={7} opacity={0.9} />
        <path d="M 10 34 A 22 22 0 0 1 32 12" fill="none" stroke={C2} strokeWidth={7} opacity={0.9} />
        <path d="M 32 12 A 22 22 0 0 1 54 34" fill="none" stroke={C3} strokeWidth={7} opacity={0.9} />
        <path
          d="M 10 34 A 22 22 0 0 1 54 34"
          fill="none"
          stroke="currentColor"
          strokeWidth={0.75}
          className="text-muted-foreground/40"
        />
        <line x1={32} y1={34} x2={44} y2={18} stroke="#e2e8f0" strokeWidth={2} strokeLinecap="round" />
        <circle cx={32} cy={34} r={2.5} fill="#fff" />
      </svg>
    );
  }

  return (
    <svg viewBox={VB} className="gauge-type-icon" aria-hidden preserveAspectRatio="xMidYMid meet">
      <path d="M 8 34 A 24 24 0 0 1 24 14" fill="none" stroke={C1} strokeWidth={6} opacity={0.9} />
      <path d="M 24 14 A 24 24 0 0 1 40 14" fill="none" stroke={C2} strokeWidth={6} opacity={0.9} />
      <path d="M 40 14 A 24 24 0 0 1 56 34" fill="none" stroke={C3} strokeWidth={6} opacity={0.9} />
      <line x1={32} y1={34} x2={42} y2={18} stroke="#e2e8f0" strokeWidth={2} strokeLinecap="round" />
      <circle cx={32} cy={34} r={2.5} fill="#fff" />
    </svg>
  );
}

export function GaugeTypeSelector({
  value,
  onChange,
  className,
}: {
  value: GaugeTypeId;
  onChange: (type: GaugeTypeId) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid w-full grid-cols-3 gap-2", className)}>
      {TYPES.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              "gauge-type-btn flex flex-col items-stretch gap-1.5 overflow-hidden rounded-lg border-2 p-2 transition-colors",
              active
                ? "border-primary bg-primary/15"
                : "border-border/50 bg-muted/30 hover:bg-muted/50"
            )}
            title={t.label}
          >
            <div className="gauge-type-mini flex aspect-[8/5] w-full items-center justify-center">
              <MiniGaugeIcon type={t.id} />
            </div>
            <span
              className={cn(
                "text-center text-[10px] font-medium leading-tight",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
