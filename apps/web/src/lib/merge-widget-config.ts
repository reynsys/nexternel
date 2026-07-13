import type { WidgetConfig } from "@/types/dashboard";
import type { WidgetPlatformInstance } from "@/widget-platform/types";

/** Deep-merge widget config patches (display + appearance + platform). */
export function mergeWidgetConfig(
  existing: WidgetConfig,
  patch: WidgetConfig
): WidgetConfig {
  const mergedPlatform =
    patch.platform !== undefined
      ? mergePlatformInstance(existing.platform, patch.platform)
      : existing.platform;

  return {
    ...existing,
    ...patch,
    display: {
      ...existing.display,
      ...patch.display,
    },
    appearance: {
      ...existing.appearance,
      ...patch.appearance,
    },
    platform: mergedPlatform,
  };
}

function mergePlatformInstance(
  existing: WidgetPlatformInstance | undefined,
  patch: WidgetPlatformInstance
): WidgetPlatformInstance {
  if (!existing || existing.definitionId !== patch.definitionId) {
    return patch;
  }
  if (patch.definitionId === "gauge") {
    return {
      version: 1,
      definitionId: "gauge",
      presetId: patch.presetId ?? existing.presetId,
      binding: patch.binding ?? existing.binding,
      design: patch.design ?? {},
      format: patch.format !== undefined ? patch.format : existing.format,
    };
  }
  return patch;
}