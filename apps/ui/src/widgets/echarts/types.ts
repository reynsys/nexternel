import type { WidgetCategoryId } from "@nexternel/plugin-sdk";
import type { HistoryRange } from "../../api";

export type EchartsDataMode = "live" | "history" | "none";

export type HistoryPoint = { t: string; v: number };

export type EchartsBuildCtx = {
  value: number;
  unit: string;
  title: string;
  kind: string;
  min: number;
  max: number;
  /** Nice tick count for gauges (set by renderer for family=gauge). */
  splitNumber?: number;
  accent?: string;
  points: HistoryPoint[];
  range: HistoryRange;
  /** Shortest side of the chart host in px — used to scale gauge fonts/arcs. */
  sizePx?: number;
};

export type EchartsPreset = {
  id: string;
  label: string;
  description: string;
  family: string;
  category: WidgetCategoryId;
  dataMode: EchartsDataMode;
  defaultSize: { w: number; h: number };
  /** Needs a capability binding (false only for blank / system shells). */
  needsCapability: boolean;
  buildOption: (ctx: EchartsBuildCtx) => Record<string, unknown>;
};

export type EchartsWidgetConfig = {
  presetId: string;
  range?: HistoryRange;
  min?: number;
  max?: number;
  accent?: string;
  optionOverride?: Record<string, unknown>;
};
