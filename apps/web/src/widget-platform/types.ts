/** Widget platform v1 — shared instance model (stored in WidgetConfig.platform). */

export type WidgetDefinitionId = "gauge";

export type WidgetBinding =
  | { kind: "sensor"; sensorId: string }
  | { kind: "none" };

export type ValueFormatConfig = {
  unit?: string;
  decimals?: number;
  /** Multiply raw value before display (e.g. 0.001 for unit conversion). */
  scale?: number;
};

export type GaugeTypeId = "semicircle" | "radial" | "grafana";

export type SerializableSubArc = {
  limit?: number;
  color: string;
  showTick?: boolean;
};

export type GaugeDesignConfig = {
  gaugeType?: GaugeTypeId;
  minValue?: number;
  maxValue?: number;
  startAngle?: number;
  endAngle?: number;
  marginInPercent?: number;
  arc?: {
    width?: number;
    padding?: number;
    cornerRadius?: number;
    padEndpoints?: boolean;
    nbSubArcs?: number;
    gradient?: boolean;
    colorArray?: string[];
    subArcs?: SerializableSubArc[];
    emptyColor?: string;
    subArcsStrokeWidth?: number;
    subArcsStrokeColor?: string;
    outerArc?: {
      width?: number;
      padding?: number;
      cornerRadius?: number;
    };
    effects?: {
      glow?: boolean;
      glowBlur?: number;
      glowSpread?: number;
      innerShadow?: boolean;
      dropShadow?: { dy?: number; blur?: number; opacity?: number };
    };
  };
  pointer?: {
    type?: "needle" | "blob" | "arrow";
    color?: string;
    baseColor?: string;
    length?: number;
    width?: number;
    strokeWidth?: number;
    strokeColor?: string;
    elastic?: boolean;
    animationDuration?: number;
    animationDelay?: number;
    hide?: boolean;
  };
  pointers?: Array<{
    value: number;
    type?: "needle" | "blob" | "arrow";
    color?: string;
    baseColor?: string;
    length?: number;
    width?: number;
    label?: string;
  }>;
  labels?: {
    valueLabel?: {
      hide?: boolean;
      matchColorWithArc?: boolean;
      animateValue?: boolean;
      fontSize?: string;
      offsetX?: number;
      offsetY?: number;
    };
    tickLabels?: {
      type?: "inner" | "outer";
      hideMinMax?: boolean;
      tickValues?: number[];
      tickFontSize?: number;
    };
  };
};

export type GaugePlatformInstance = {
  version: 1;
  definitionId: "gauge";
  presetId?: string;
  binding: WidgetBinding;
  design: GaugeDesignConfig;
  format?: ValueFormatConfig;
};

export type WidgetPlatformInstance = GaugePlatformInstance;

export function isGaugePlatformInstance(
  instance: WidgetPlatformInstance
): instance is GaugePlatformInstance {
  return instance.definitionId === "gauge";
}

export function sensorIdFromBinding(binding: WidgetBinding | undefined): string | undefined {
  if (!binding || binding.kind !== "sensor") return undefined;
  return binding.sensorId;
}
