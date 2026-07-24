import type { EchartsPreset } from "./types";
import { GAUGE_PRESETS } from "./presets/gauges";
import { CHART_PRESETS } from "./presets/charts";

const ALL: EchartsPreset[] = [...GAUGE_PRESETS, ...CHART_PRESETS];

const BY_ID = new Map(ALL.map((p) => [p.id, p]));

export function listEchartsPresets(): EchartsPreset[] {
  return ALL;
}

export function getEchartsPreset(id: string | undefined): EchartsPreset {
  if (id && BY_ID.has(id)) return BY_ID.get(id)!;
  return BY_ID.get("gauge")!;
}

export function listEchartsPresetsByCategory(
  category: EchartsPreset["category"]
): EchartsPreset[] {
  return ALL.filter((p) => p.category === category);
}

export function listEchartsFamilies(): string[] {
  return [...new Set(ALL.map((p) => p.family))];
}
