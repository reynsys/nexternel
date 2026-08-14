import type { Capability, WidgetInstance } from "../../api";
import { primaryCapabilityId } from "../../lib/widget-bindings";
import { EChartsWidgetBody } from "../echarts/EChartsWidgetBody";
import { GaugeTileFrame } from "./GaugeTileFrame";

type Props = {
  widget: WidgetInstance;
  capabilities: Capability[];
};

export function GaugeWidget({ widget, capabilities }: Props) {
  const capId = primaryCapabilityId(widget.bindings);
  const cap = capabilities.find((c) => c.id === capId);
  const dataLabel = cap?.name?.trim() ?? "";

  return (
    <GaugeTileFrame widget={widget} cap={cap}>
      <EChartsWidgetBody
        widget={widget}
        cap={cap}
        dataLabel={dataLabel}
        tileTitle={null}
      />
    </GaugeTileFrame>
  );
}
