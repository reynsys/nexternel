import type { PluginManifest } from "@nexternel/plugin-sdk";

/** Keep in sync with packages/plugin-example-clock/src/manifest.ts */
const clockPluginManifest: PluginManifest = {
  id: "nexternel.example-clock",
  version: "1.1.0",
  pluginApi: 1,
  name: "Clock",
  description: "Digital or analog clock that fills the widget",
  contributes: { widgets: ["plugin.clock"] },
};

/** Keep in sync with packages/plugin-air-quality/src/manifest.ts */
const airQualityPluginManifest: PluginManifest = {
  id: "nexternel.air-quality",
  version: "1.0.0",
  pluginApi: 1,
  name: "Air quality",
  description: "PM, temperature, humidity, AQI, and measure control",
  contributes: { widgets: ["plugin.air-quality"] },
};

export function listBuiltinPlugins(): PluginManifest[] {
  return [clockPluginManifest, airQualityPluginManifest];
}
