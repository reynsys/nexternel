"use client";

import type { GaugePlatformInstance } from "@/widget-platform/types";
import { buildGaugeComponentProps, formatGaugeDisplayValue } from "@/widget-platform/definitions/gauge/build-props";
import { GaugePrimitive } from "@/widget-platform/renderer/GaugePrimitive";
import { cn } from "@/lib/utils";

/**
 * Internet speed dial — fill host like Temp/Humidity.
 * Mbps uses the SVG valueLabel (same as Temp/Humidity), forced visible with a
 * solid px fontSize — HTML overlays kept detaching below the arc on tall cells.
 */
export function SpeedTestDial({
  label,
  valueMbps,
  platform,
  showLabel = false,
  className,
}: {
  label: string;
  valueMbps: number | null;
  platform: GaugePlatformInstance;
  showLabel?: boolean;
  className?: string;
}) {
  const cellPlatform: GaugePlatformInstance = {
    ...platform,
    design: {
      ...platform.design,
      // Match Studio-style dial margins so the arc + value sit in the fill box.
      marginInPercent: platform.design?.marginInPercent ?? {
        top: 0.05,
        bottom: 0.05,
        left: 0.08,
        right: 0.08,
      },
      labels: {
        ...platform.design?.labels,
        valueLabel: {
          hide: false,
          fontSize: "22px",
          offsetY: -28,
          matchColorWithArc: false,
        },
        tickLabels: platform.design?.labels?.tickLabels,
      },
    },
    format: {
      ...platform.format,
      unit: "Mbps",
      decimals: valueMbps !== null && valueMbps < 10 ? 1 : 0,
    },
  };

  const gaugeProps = buildGaugeComponentProps(cellPlatform, valueMbps, "Mbps", {
    layoutContext: "standard",
  });

  // Ensure format always paints a real Mbps string (never a bare "-").
  if (gaugeProps.labels && typeof gaugeProps.labels === "object") {
    const labels = gaugeProps.labels as {
      valueLabel?: { hide?: boolean; formatTextValue?: (v: number) => string; offsetY?: number };
    };
    if (labels.valueLabel && !labels.valueLabel.hide) {
      labels.valueLabel.formatTextValue = (v: number) =>
        formatGaugeDisplayValue(v, cellPlatform.format, "Mbps");
      labels.valueLabel.offsetY = -28;
    }
  }

  return (
    <div
      className={cn(
        "speed-test-gauge flex h-full min-h-0 w-full min-w-0 flex-col",
        className
      )}
    >
      {showLabel ? (
        <p className="speed-test-gauge-label shrink-0 truncate text-center text-[8px] font-medium leading-none text-muted-foreground">
          {label}
        </p>
      ) : null}

      <div className="speed-test-gauge-dial-area min-h-0 w-full flex-1">
        <GaugePrimitive
          props={gaugeProps}
          layoutMode="cell"
          className="min-h-0 h-full w-full flex-1"
        />
      </div>
    </div>
  );
}
