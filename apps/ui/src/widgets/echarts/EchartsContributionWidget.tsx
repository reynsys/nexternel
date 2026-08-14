import type { Capability, WidgetInstance } from "../../api";
import { primaryCapabilityId } from "../../lib/widget-bindings";
import { GaugeTileFrame } from "../gauge/GaugeTileFrame";
import { migrateWidgetToEcharts, parseEchartsConfig } from "./config";
import { EChartsWidgetBody } from "./EChartsWidgetBody";
import { getEchartsPreset } from "./registry";

type Props = {
  widget: WidgetInstance;
  capabilities: Capability[];
};

/** Standalone ECharts tiles (history charts, live diagrams) on the dashboard grid. */
export function EchartsContributionWidget({
  widget,
  capabilities,
}: Props) {
  const migrated = migrateWidgetToEcharts(widget);
  const capId = primaryCapabilityId(migrated.bindings);
  const cap = capabilities.find((c) => c.id === capId);
  const dataLabel = cap?.name?.trim() ?? "";
  const preset = getEchartsPreset(parseEchartsConfig(migrated.config).presetId);
  const isGauge = preset.family === "gauge";

  const body = (
    <EChartsWidgetBody
      widget={migrated}
      cap={cap}
      dataLabel={dataLabel}
      tileTitle={null}
    />
  );

  if (isGauge) {
    return (
      <GaugeTileFrame widget={migrated} cap={cap}>
        {body}
      </GaugeTileFrame>
    );
  }

  return body;
}
