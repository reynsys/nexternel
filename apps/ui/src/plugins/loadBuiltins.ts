import { clockWidgetContribution } from "@nexternel/plugin-example-clock";
import { createAirQualityWidgetContribution } from "@nexternel/plugin-air-quality";
import { AirQualityWidget } from "../widgets/air-quality/AirQualityWidget";
import { registerWidget } from "./registry";

/** Trusted first-party plugins — add one import + register line per plugin. */
export function loadBuiltins() {
  registerWidget(clockWidgetContribution);
  registerWidget(createAirQualityWidgetContribution(AirQualityWidget));
}
