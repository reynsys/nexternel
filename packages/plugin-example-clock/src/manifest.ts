import type { PluginManifest } from "@nexternel/plugin-sdk";

export const CLOCK_WIDGET_TYPE = "plugin.clock";

export const clockPluginManifest: PluginManifest = {
  id: "nexternel.example-clock",
  version: "1.1.0",
  pluginApi: 1,
  name: "Clock",
  description: "Digital or analog clock that fills the widget",
  contributes: { widgets: [CLOCK_WIDGET_TYPE] },
};
