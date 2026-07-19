"use client";

import dynamic from "next/dynamic";
import type { GaugeComponentProps } from "react-gauge-component";
import {
  GAUGE_DIAL_HOST_CLASS,
  GAUGE_DIAL_WRAP_CLASS,
  GAUGE_STUDIO_DIAL_HOST_CLASS,
} from "@/widget-platform/gauge-cell-layout";
import { cn } from "@/lib/utils";

const GaugeComponent = dynamic(() => import("react-gauge-component"), { ssr: false });

type GaugeCallbacks = {
  onValueChange?: (value: number) => void;
  onPointerChange?: (index: number, value: number) => void;
};

export type GaugePrimitiveLayoutMode = "cell" | "studio";

/**
 * Dashboard cells — fill the dial region in normal (wide) cells.
 * A stage wrapper lets CSS center a natural semicircle only when the dial
 * region is tall (e.g. browser F11), without shrinking normal-mode dials.
 */
function GaugeCellFillHost({
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

  return (
    <div
      className={cn(
        GAUGE_DIAL_WRAP_CLASS,
        GAUGE_DIAL_HOST_CLASS,
        "min-h-0 w-full flex-1",
        className
      )}
      data-gauge-type={props.type ?? "semicircle"}
    >
      <div className="gauge-dial-stage">
        <GaugeComponent {...merged} />
      </div>
    </div>
  );
}

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
    <GaugeCellFillHost
      props={props}
      className={className}
      onValueChange={onValueChange}
      onPointerChange={onPointerChange}
    />
  );
}
