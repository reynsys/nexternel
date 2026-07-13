import type { GaugePlatformInstance } from "@/widget-platform/types";
import type { GaugeSandboxConfig } from "@/widget-platform/studio/gauge-sandbox-bridge";
import { getGaugePreset } from "@/widget-platform/definitions/gauge/presets";
import { sandboxConfigToPlatform } from "@/widget-platform/studio/gauge-sandbox-bridge";
import { sanitizeGaugePlatform } from "@/widget-platform/studio/sanitize-platform";
/** Format for save/display — sensor-bound gauges must not store a stale unit (e.g. Mbps on temperature). */
export function resolveGaugeFormat(instance: GaugePlatformInstance): GaugePlatformInstance["format"] {
  const preset = getGaugePreset(instance.presetId);
  const isSensor = instance.binding?.kind === "sensor";
  if (isSensor) {
    const decimals = instance.format?.decimals ?? preset?.format?.decimals;
    return decimals !== undefined ? { decimals } : undefined;
  }
  if (instance.format) return { ...instance.format };
  if (preset?.format) return { ...preset.format };
  return undefined;
}

/** Full platform snapshot for PATCH — design + format + presetId, no stale merge. */
export function buildStudioPlatformSnapshot(
  sandbox: GaugeSandboxConfig,
  draft: GaugePlatformInstance
): GaugePlatformInstance {
  const merged = sandboxConfigToPlatform(sandbox, draft);
  return sanitizeGaugePlatform({
    version: 1,
    definitionId: "gauge",
    presetId: draft.presetId,
    binding: draft.binding,
    design: merged.design ?? {},
    format: resolveGaugeFormat(draft),
  });
}
