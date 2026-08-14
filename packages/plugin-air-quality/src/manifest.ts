import type { PluginManifest } from "@nexternel/plugin-sdk";

export const AIR_QUALITY_WIDGET_TYPE = "plugin.air-quality";

export const airQualityPluginManifest: PluginManifest = {
  id: "nexternel.air-quality",
  version: "1.0.0",
  pluginApi: 1,
  name: "Air quality",
  description: "PM, temperature, humidity, AQI, and measure control",
  contributes: { widgets: [AIR_QUALITY_WIDGET_TYPE] },
};
