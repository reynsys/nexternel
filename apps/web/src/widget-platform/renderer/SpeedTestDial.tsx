"use client";

import type { GaugePlatformInstance } from "@/widget-platform/types";
import { buildGaugeComponentProps, formatGaugeDisplayValue } from "@/widget-platform/definitions/gauge/build-props";
import { GaugePrimitive } from "@/widget-platform/renderer/GaugePrimitive";
import { cn } from "@/lib/utils";

/**
 * Internet speed dial — same DOM path as Temp / Humidity (GaugePrimitive only).
 * LAN/WAN rails are overlaid by SpeedTestWidget; no extra dial wrappers here.
 */
export function SpeedTestDial({
  valueMbps,
  platform,
  className,
}: {
  label?: string;
  valueMbps: number | null;
  platform: GaugePlatformInstance;
  showLabel?: boolean;
  className?: string;
}) {
  const savedValue = platform.design?.labels?.valueLabel;
  const cellPlatform: GaugePlatformInstance = {
    ...platform,
    design: {
      ...platform.design,
      marginInPercent: platform.design?.marginInPercent,
      labels: {
        ...platform.design?.labels,
        valueLabel: {
          hide: false,
          fontSize: "clamp(0.8rem, 7cqmin, 1.5rem)",
          matchColorWithArc: savedValue?.matchColorWithArc ?? false,
          animateValue: savedValue?.animateValue,
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

  if (gaugeProps.labels && typeof gaugeProps.labels === "object") {
    const labels = gaugeProps.labels as {
      valueLabel?: { hide?: boolean; formatTextValue?: (v: number) => string };
    };
    if (labels.valueLabel && !labels.valueLabel.hide) {
      labels.valueLabel.formatTextValue = (v: number) =>
        formatGaugeDisplayValue(v, cellPlatform.format, "Mbps");
    }
  }

  return (
    <GaugePrimitive
      props={gaugeProps}
      layoutMode="cell"
      className={cn("min-h-0 h-full w-full flex-1", className)}
    />
  );
}
