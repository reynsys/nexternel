"use client";

import type { TooltipProps } from "recharts";

type ChartTooltipEntry = {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
};

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  nameFormatter,
}: TooltipProps<number, string> & {
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number, name: string) => string;
  nameFormatter?: (name: string) => string;
}) {
  if (!active || !payload?.length) return null;

  const displayLabel = labelFormatter
    ? labelFormatter(String(label ?? ""))
    : String(label ?? "");

  return (
    <div className="pointer-events-none z-50 min-w-[8rem] rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
      {displayLabel ? (
        <p className="mb-1.5 border-b border-border/60 pb-1 font-medium text-muted-foreground">
          {displayLabel}
        </p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((entry: ChartTooltipEntry) => {
          const rawName = String(entry.name ?? entry.dataKey ?? "Value");
          const name = nameFormatter ? nameFormatter(rawName) : rawName;
          const raw = entry.value;
          const value =
            typeof raw === "number" && valueFormatter
              ? valueFormatter(raw, name)
              : raw != null
                ? String(raw)
                : "—";
          return (
            <li key={name} className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color || "var(--primary)" }}
              />
              <span className="min-w-0 truncate text-muted-foreground">{name}</span>
              <span className="ml-auto shrink-0 font-mono font-semibold tabular-nums text-foreground">
                {value}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
