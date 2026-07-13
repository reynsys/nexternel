import type { WidgetDefinitionId } from "@/widget-platform/types";

export type WidgetDefinitionMeta = {
  id: WidgetDefinitionId;
  label: string;
  description: string;
  bindingKinds: ("sensor" | "none")[];
  defaultColSpan: number;
  defaultRowSpan: number;
};

export const WIDGET_DEFINITION_CATALOG: WidgetDefinitionMeta[] = [
  {
    id: "gauge",
    label: "Gauge",
    description: "Semicircle, radial, or Grafana-style dial (react-gauge-component)",
    bindingKinds: ["sensor", "none"],
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
];

export function getDefinitionMeta(id: WidgetDefinitionId): WidgetDefinitionMeta | undefined {
  return WIDGET_DEFINITION_CATALOG.find((d) => d.id === id);
}
