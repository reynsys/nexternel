import { isCorePanelKind } from "@nexternel/domain";
import type { ExportedDashboard } from "../migrate/types.js";

const PLUGIN_PREFIXES = ["plugin.", "air-quality", "clock"];

export function isPanelType(type: string): boolean {
  if (isCorePanelKind(type)) return true;
  if (type.startsWith("panel.")) return true;
  if (type.startsWith("view.")) return true;
  return false;
}

export function isPluginType(type: string): boolean {
  if (type.startsWith("plugin.")) return true;
  return PLUGIN_PREFIXES.some((p) => type.includes(p));
}

export function countPanelsAndPlugins(dashboards: ExportedDashboard[]): {
  panels: number;
  plugins: number;
} {
  let panels = 0;
  let plugins = 0;
  for (const dash of dashboards) {
    const doc = dash.document as {
      sections?: { widgets?: { type?: string }[] }[];
    };
    for (const section of doc?.sections ?? []) {
      for (const w of section.widgets ?? []) {
        const t = w.type ?? "";
        if (isPanelType(t)) panels += 1;
        else if (isPluginType(t)) plugins += 1;
      }
    }
  }
  return { panels, plugins };
}
