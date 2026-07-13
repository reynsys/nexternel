import type { DashboardWidgetDto } from "@/types/dashboard";
import type { WidgetConfig } from "@/types/dashboard";
import type { GaugePlatformInstance, WidgetPlatformInstance } from "@/widget-platform/types";
import {
  legacyGaugeToPlatform,
  isLegacyGaugeLibraryId,
  legacyWidgetToGaugePlatform,
} from "@/widget-platform/definitions/gauge/legacy-map";
import { parseWidgetPlatformInstance } from "@/widget-platform/schema/instance";
import { ensureGaugePlatform, sanitizeGaugePlatform } from "@/widget-platform/studio/sanitize-platform";
/** Dual-read: stored platform config, or virtual migration from legacy library gauges. */
export function resolveWidgetPlatform(widget: DashboardWidgetDto): WidgetPlatformInstance | null {
  if (widget.config.platform) {
    const parsed = parseWidgetPlatformInstance(widget.config.platform);
    if (parsed.ok) return sanitizeGaugePlatform(ensureGaugePlatform(parsed.data));

    const sanitized = sanitizeGaugePlatform(
      ensureGaugePlatform(widget.config.platform as GaugePlatformInstance)
    );
    const retry = parseWidgetPlatformInstance(sanitized);
    if (retry.ok) return retry.data;

    const raw = widget.config.platform as GaugePlatformInstance;
    if (raw?.definitionId === "gauge") return sanitizeGaugePlatform(ensureGaugePlatform(raw));
    return null;
  }

  if (widget.type === "library" && isLegacyGaugeLibraryId(widget.config.libraryId)) {
    return legacyGaugeToPlatform(widget.config);
  }

  const migrated = legacyWidgetToGaugePlatform(widget);
  if (migrated) return migrated;

  return null;
}

/** Persisted gauge platform from widget config (not virtual legacy migration). */
export function savedGaugePlatform(
  config: WidgetConfig
): GaugePlatformInstance | null {
  const raw = config.platform;
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as GaugePlatformInstance;
  if (candidate.definitionId !== "gauge") return null;

  const parsed = parseWidgetPlatformInstance(candidate);
  if (parsed.ok) return parsed.data;

  const sanitized = sanitizeGaugePlatform(candidate);
  const retry = parseWidgetPlatformInstance(sanitized);
  if (retry.ok) return retry.data;

  return sanitized;
}

export function widgetUsesPlatformRenderer(widget: DashboardWidgetDto): boolean {
  if (widget.type === "speed_test") {
    return savedGaugePlatform(widget.config) !== null;
  }
  return resolveWidgetPlatform(widget) !== null;
}

/** Any gauge-like widget can open Widget Studio (library gauges, radial stat, speed test, saved platform). */
export function widgetSupportsGaugeStudio(widget: DashboardWidgetDto): boolean {
  if (widget.config.platform) {
    const parsed = parseWidgetPlatformInstance(widget.config.platform);
    if (parsed.ok && parsed.data.definitionId === "gauge") return true;
  }
  if (widget.type === "library") {
    const id = widget.config.libraryId;
    if (id?.startsWith("gauge-") || id === "radial-stat") return true;
  }
  if (widget.type === "speed_test") return true;
  return false;
}