"use client";

import type { GaugePlatformInstance } from "@/widget-platform/types";
import { buildGaugeComponentProps } from "@/widget-platform/definitions/gauge/build-props";
import { GaugePrimitive } from "@/widget-platform/renderer/GaugePrimitive";
import { cn } from "@/lib/utils";

function formatMbps(value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (value < 10) return value.toFixed(1);
  return String(Math.round(value));
}

/**
 * Internet speed download dial.
 * Dashboard: compact layout (arc in aspect frame, Mbps readout as HTML — never clipped).
 */
export function SpeedTestDial({
  label,
  valueMbps,
  platform,
  showLabel = true,
  className,
}: {
  label: string;
  valueMbps: number | null;
  platform: GaugePlatformInstance;
  showLabel?: boolean;
  className?: string;
}) {
  const gaugeProps = buildGaugeComponentProps(platform, valueMbps, "Mbps", {
    layoutContext: "compact",
  });
  const displayValue = formatMbps(valueMbps);

  return (
    <div
      className={cn(
        "speed-test-gauge flex h-full min-h-0 w-full min-w-0 flex-col items-stretch",
        className
      )}
    >
      {showLabel ? (
        <p className="speed-test-gauge-label shrink-0 truncate text-center text-[8px] font-medium leading-none text-muted-foreground">
          {label}
        </p>
      ) : null}
      <GaugePrimitive props={gaugeProps} className="min-h-0 w-full flex-1" />
      <div className="speed-test-gauge-readout shrink-0 text-center leading-none">
        <span className="speed-test-gauge-value font-bold tabular-nums text-foreground">
          {displayValue}
        </span>
        <span className="speed-test-gauge-unit ml-0.5 text-muted-foreground">Mbps</span>
      </div>
    </div>
  );
}
