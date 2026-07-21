import type { WidgetContribution } from "@nexternel/plugin-sdk";

const byType = new Map<string, WidgetContribution>();

export function registerWidget(contribution: WidgetContribution) {
  byType.set(contribution.type, contribution);
}

export function getWidgetContribution(type: string): WidgetContribution | undefined {
  return byType.get(type);
}

export function listWidgetContributions(): WidgetContribution[] {
  return Array.from(byType.values());
}
