"use client";

import type { GaugePlatformInstance } from "@/widget-platform/types";
import { buildGaugeComponentProps } from "@/widget-platform/definitions/gauge/build-props";
import { GaugePrimitive } from "@/widget-platform/renderer/GaugePrimitive";
import { WIDGET_FIT_GAUGE } from "@/lib/dashboard-grid";
import { cn } from "@/lib/utils";

export function GaugeStudioDial({
  instance,
  previewValue,
  unit,
  interactionEnabled,
  remountKey,
  onValueChange,
  onPointerChange,
  className,
}: {
  instance: GaugePlatformInstance;
  previewValue: number;
  unit?: string | null;
  interactionEnabled: boolean;
  remountKey: string;
  onValueChange?: (value: number) => void;
  onPointerChange?: (index: number, value: number) => void;
  className?: string;
}) {
  const gaugeProps = buildGaugeComponentProps(instance, previewValue, unit);

  return (
    <div className={cn(WIDGET_FIT_GAUGE, "h-full min-h-0 w-full", className)}>
      <GaugePrimitive
        props={gaugeProps}
        layoutMode="studio"
        studioRemountKey={remountKey}
        className="h-full min-h-0 w-full"
        onValueChange={interactionEnabled ? onValueChange : undefined}
        onPointerChange={interactionEnabled ? onPointerChange : undefined}
      />
    </div>
  );
}
