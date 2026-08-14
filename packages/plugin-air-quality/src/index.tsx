import type { WidgetBindingSlotDef, WidgetContribution } from "@nexternel/plugin-sdk";
import {
  AIR_QUALITY_WIDGET_TYPE,
  airQualityPluginManifest,
} from "./manifest";

export { AIR_QUALITY_WIDGET_TYPE, airQualityPluginManifest } from "./manifest";

export const AIR_QUALITY_BINDING_SLOTS: WidgetBindingSlotDef[] = [
  {
    key: "pm1",
    label: "PM1.0",
    kinds: ["pm1", "number"],
    nameHints: ["1.0", "pm_1", "pm1", "<1"],
  },
  {
    key: "pm25",
    label: "PM2.5",
    kinds: ["pm25", "number"],
    nameHints: ["2.5", "pm_2", "pm25", "<2.5"],
  },
  {
    key: "pm10",
    label: "PM10",
    kinds: ["pm10", "number"],
    nameHints: ["10.0", "pm_10", "pm10", "<10"],
  },
  {
    key: "temperature",
    label: "Temperature",
    kinds: ["temperature"],
    nameHints: ["temp", "temperature"],
  },
  {
    key: "humidity",
    label: "Humidity",
    kinds: ["humidity"],
    nameHints: ["humid", "humidity"],
  },
  {
    key: "measure",
    label: "Start measuring",
    kinds: ["switch"],
    nameHints: ["measur", "pms", "start"],
    required: true,
  },
];

export { aqiBandPillStyle, aqiColor, aqiFromPm25, aqiLabel } from "./aqi";
export { IconAqi, IconHumidity, IconPm, IconTemperature } from "./icons";

export const airQualityWidgetMeta = {
  type: AIR_QUALITY_WIDGET_TYPE,
  label: "Air quality panel",
  category: "sensors" as const,
  needsCapability: false,
  bindingSlots: AIR_QUALITY_BINDING_SLOTS,
  defaultSize: { w: 4, h: 4 },
};

/** UI host supplies the React component (MUI lives in apps/ui). */
export function createAirQualityWidgetContribution(
  Component: WidgetContribution["Component"]
): WidgetContribution {
  return { ...airQualityWidgetMeta, Component };
}
