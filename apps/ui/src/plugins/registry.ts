import type { PluginManifest, PanelContribution } from "@nexternel/plugin-sdk";

const panelsByType = new Map<string, PanelContribution>();
const manifestsById = new Map<string, PluginManifest>();

export function registerPlugin(manifest: PluginManifest) {
  manifestsById.set(manifest.id, manifest);
}

export function registerPanel(contribution: PanelContribution) {
  panelsByType.set(contribution.type, contribution);
}

/** @deprecated use registerPanel */
export function registerWidget(contribution: PanelContribution) {
  registerPanel(contribution);
}

export function getPanelContribution(type: string): PanelContribution | undefined {
  return panelsByType.get(type);
}

/** @deprecated use getPanelContribution */
export function getWidgetContribution(type: string): PanelContribution | undefined {
  return getPanelContribution(type);
}

export function listPanelContributions(): PanelContribution[] {
  return Array.from(panelsByType.values());
}

/** @deprecated use listPanelContributions */
export function listWidgetContributions(): PanelContribution[] {
  return listPanelContributions();
}

export function listPluginManifests(): PluginManifest[] {
  return Array.from(manifestsById.values());
}

export function getPluginManifest(id: string): PluginManifest | undefined {
  return manifestsById.get(id);
}

export function getPluginManifestForWidgetType(
  type: string
): PluginManifest | undefined {
  return listPluginManifests().find((m) => m.contributes.widgets?.includes(type));
}
