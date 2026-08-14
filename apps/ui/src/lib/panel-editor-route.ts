import type { WidgetInstance } from "../api";
import { normalizePanelKind } from "./panel-kind";
import { isPanelWidgetType } from "../widgets/panel";
import {
  getPanelScopeMode,
  panelIsIntegrationKind,
  type PanelScopeMode,
} from "@nexternel/domain";
import type { GeneralWidgetType } from "../widgets/general/config";
import { GAUGE_WIDGET_TYPE } from "../widgets/gauge";
import { isEchartsWidgetType } from "../widgets/echarts/config";
import { CLOCK_WIDGET_TYPE } from "@nexternel/plugin-example-clock";
import { AIR_QUALITY_WIDGET_TYPE } from "@nexternel/plugin-air-quality";

export type DashboardEditorKind =
  | "scoped-panel"
  | "integration-panel"
  | "clock"
  | "air-quality"
  | "gauge"
  | null;

const INTEGRATION_GENERAL_TYPE: Partial<Record<string, GeneralWidgetType>> = {
  "panel.weather": "weather",
  "panel.system": "system_info",
  "panel.calendar": "calendar",
  "panel.devices": "device_status",
};

/** Map `panel.*` integration kinds to legacy general widget types for the shared editor. */
export function panelAsGeneralWidget(widget: WidgetInstance): WidgetInstance | null {
  if (!isPanelWidgetType(widget.type)) return null;
  const kind = normalizePanelKind(widget.type);
  if (!panelIsIntegrationKind(kind)) return null;
  const generalType = INTEGRATION_GENERAL_TYPE[kind];
  if (!generalType) return null;
  return { ...widget, type: generalType };
}

export function resolveDashboardEditorKind(widget: WidgetInstance): DashboardEditorKind {
  if (widget.type === CLOCK_WIDGET_TYPE) return "clock";
  if (widget.type === AIR_QUALITY_WIDGET_TYPE) return "air-quality";
  if (widget.type === GAUGE_WIDGET_TYPE || isEchartsWidgetType(widget.type)) return "gauge";
  if (!isPanelWidgetType(widget.type)) return null;
  const mode = getPanelScopeMode(widget.type);
  if (mode === "integration") return "integration-panel";
  return "scoped-panel";
}

export function panelScopeModeForAdd(kind: string): PanelScopeMode {
  return getPanelScopeMode(kind);
}
