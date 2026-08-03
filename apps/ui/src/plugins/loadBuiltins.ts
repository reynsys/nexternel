import { clockWidgetContribution } from "@nexternel/plugin-example-clock";
import { airQualityWidgetContribution } from "@nexternel/plugin-air-quality";
import { registerWidget } from "./registry";

/** Trusted first-party plugins — add one import + register line per plugin. */
export function loadBuiltins() {
  registerWidget(clockWidgetContribution);
  registerWidget(airQualityWidgetContribution);
}
