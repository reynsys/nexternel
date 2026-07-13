import type { GaugeSandboxConfig } from "@/widget-platform/studio/gauge-sandbox-bridge";
import type { GaugePlatformInstance } from "@/widget-platform/types";
import {
  parseGaugeJsx,
  sandboxToJsxConfig,
  stringifyGaugeJsx,
} from "@/widget-platform/studio/gauge-studio-jsx";
import { sandboxConfigToPlatform } from "@/widget-platform/studio/gauge-sandbox-bridge";

export type GaugeStudioClipboard = {
  platform: GaugePlatformInstance;
  previewValue?: number;
};

export function serializeGaugeStudio(data: GaugeStudioClipboard): string {
  return JSON.stringify(data, null, 2);
}

export function parseGaugeStudioJson(text: string): GaugeStudioClipboard | null {
  try {
    const parsed = JSON.parse(text) as GaugeStudioClipboard;
    if (!parsed?.platform || parsed.platform.definitionId !== "gauge") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function copyGaugeStudioJsx(
  sandbox: GaugeSandboxConfig,
  previewValue: number
): Promise<boolean> {
  try {
    const code = stringifyGaugeJsx(sandboxToJsxConfig(sandbox), previewValue);
    await navigator.clipboard.writeText(code);
    return true;
  } catch {
    return false;
  }
}

export async function copyGaugeStudioJson(data: GaugeStudioClipboard): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(serializeGaugeStudio(data));
    return true;
  } catch {
    return false;
  }
}

export async function pasteGaugeStudio(
  existing: GaugePlatformInstance
): Promise<GaugeStudioClipboard | null> {
  try {
    const text = await navigator.clipboard.readText();

    const jsx = parseGaugeJsx(text);
    if (jsx?.sandbox) {
      const merged: GaugeSandboxConfig = {
        type: jsx.sandbox.type ?? "semicircle",
        minValue: jsx.sandbox.minValue ?? 0,
        maxValue: jsx.sandbox.maxValue ?? 100,
        startAngle: jsx.sandbox.startAngle,
        endAngle: jsx.sandbox.endAngle,
        marginInPercent: jsx.sandbox.marginInPercent,
        arc: jsx.sandbox.arc,
        pointer: jsx.sandbox.pointer,
        pointers: jsx.sandbox.pointers,
        labels: jsx.sandbox.labels,
      };
      return {
        platform: sandboxConfigToPlatform(merged, existing),
        previewValue: jsx.previewValue,
      };
    }

    return parseGaugeStudioJson(text);
  } catch {
    return null;
  }
}
