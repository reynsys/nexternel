import { clockPluginManifest, clockWidgetContribution } from "@nexternel/plugin-example-clock";
import {
  airQualityPluginManifest,
  createAirQualityWidgetContribution,
} from "@nexternel/plugin-air-quality";
import { AirQualityWidget } from "../widgets/air-quality/AirQualityWidget";
import { registerPlugin, registerPanel } from "./registry";
import { gaugePanelMeta, GaugeWidget } from "../widgets/gauge";

/** Trusted first-party panels — add manifest + panel registration per type. */
export function loadBuiltins() {
  registerPanel({ ...gaugePanelMeta, Component: GaugeWidget });

  registerPlugin(clockPluginManifest);
  registerPanel(clockWidgetContribution);

  registerPlugin(airQualityPluginManifest);
  registerPanel(createAirQualityWidgetContribution(AirQualityWidget));
}
