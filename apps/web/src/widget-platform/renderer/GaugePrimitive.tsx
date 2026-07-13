"use client";

import dynamic from "next/dynamic";
import type { GaugeComponentProps } from "react-gauge-component";
import type { GaugeTypeId } from "@/widget-platform/types";
import {
  GAUGE_ASPECT_FRAME_CLASS,
  GAUGE_ASPECT_SLOT_CLASS,
  GAUGE_DIAL_HOST_CLASS,
  GAUGE_DIAL_WRAP_CLASS,
  GAUGE_STUDIO_DIAL_HOST_CLASS,
  gaugeAspectRatio,
} from "@/widget-platform/gauge-cell-layout";
import { useGaugeAspectFit } from "@/hooks/use-gauge-aspect-fit";
import { cn } from "@/lib/utils";

const GaugeComponent = dynamic(() => import("react-gauge-component"), { ssr: false });

type GaugeCallbacks = {
  onValueChange?: (value: number) => void;
  onPointerChange?: (index: number, value: number) => void;
};

export type GaugePrimitiveLayoutMode = "cell" | "studio";

/** Dashboard grid cells — aspect frame + ResizeObserver fit. */
function GaugeCellAspectHost({
  props,
  className,
  onValueChange,
  onPointerChange,
}: {
  props: GaugeComponentProps;
  className?: string;
} & GaugeCallbacks) {
  const interactive = onValueChange || onPointerChange;
  const merged = interactive
    ? ({
        ...props,
        onValueChange,
        onPointerChange,
      } as GaugeComponentProps)
    : props;

  const gaugeType = (merged.type ?? "semicircle") as GaugeTypeId;
  const aspectRatio = gaugeAspectRatio(gaugeType);
  const { containerRef, frame } = useGaugeAspectFit(aspectRatio);

  return (
    <div
      ref={containerRef}
      className={cn(
        GAUGE_DIAL_WRAP_CLASS,
        GAUGE_DIAL_HOST_CLASS,
        GAUGE_ASPECT_SLOT_CLASS,
        "min-h-0 w-full flex-1",
        className
      )}
    >
      {frame.width > 0 && frame.height > 0 ? (
        <div
          className={GAUGE_ASPECT_FRAME_CLASS}
          style={{ width: frame.width, height: frame.height }}
        >
          <GaugeComponent {...merged} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Gauge Studio Live Preview — matches react-gauge-component SandboxEditor:
 * GaugeComponent fills the preview box (no aspect frame); library handles layout.
 */
function GaugeStudioSandboxHost({
  props,
  className,
  remountKey,
  onValueChange,
  onPointerChange,
}: {
  props: GaugeComponentProps;
  className?: string;
  remountKey: string;
} & GaugeCallbacks) {
  const interactive = onValueChange || onPointerChange;
  const merged = interactive
    ? ({
        ...props,
        onValueChange,
        onPointerChange,
      } as GaugeComponentProps)
    : props;

  return (
    <div
      className={cn(
        GAUGE_DIAL_WRAP_CLASS,
        GAUGE_DIAL_HOST_CLASS,
        GAUGE_STUDIO_DIAL_HOST_CLASS,
        "h-full min-h-0 w-full",
        className
      )}
    >
      <GaugeComponent key={remountKey} {...merged} />
    </div>
  );
}

export function GaugePrimitive({
  props,
  className,
  layoutMode = "cell",
  studioRemountKey,
  onValueChange,
  onPointerChange,
}: {
  props: GaugeComponentProps;
  className?: string;
  layoutMode?: GaugePrimitiveLayoutMode;
  /** Full remount on type/preset change (SandboxEditor uses key on GaugeComponent). */
  studioRemountKey?: string;
} & GaugeCallbacks) {
  if (layoutMode === "studio") {
    return (
      <GaugeStudioSandboxHost
        props={props}
        className={className}
        remountKey={studioRemountKey ?? (props.type ?? "semicircle")}
        onValueChange={onValueChange}
        onPointerChange={onPointerChange}
      />
    );
  }

  return (
    <GaugeCellAspectHost
      props={props}
      className={className}
      onValueChange={onValueChange}
      onPointerChange={onPointerChange}
    />
  );
}
