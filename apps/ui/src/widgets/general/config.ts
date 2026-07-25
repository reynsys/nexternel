import type { WidgetInstance } from "../../api";

export const GENERAL_WIDGET_TYPES = [
  "calendar",
  "weather",
  "system_info",
  "device_status",
] as const;

export type GeneralWidgetType = (typeof GENERAL_WIDGET_TYPES)[number];

export function isGeneralWidgetType(type: string): type is GeneralWidgetType {
  return (GENERAL_WIDGET_TYPES as readonly string[]).includes(type);
}

export type WeatherConfig = {
  weatherLocation?: string;
  weatherLat?: number;
  weatherLon?: number;
};

export type DeviceStatusConfig = {
  offlineOnly?: boolean;
};

export function parseWeatherConfig(config: Record<string, unknown> | undefined): {
  weatherLocation: string;
  weatherLat: number;
  weatherLon: number;
} {
  const weatherLocation =
    typeof config?.weatherLocation === "string" && config.weatherLocation.trim()
      ? config.weatherLocation.trim()
      : "Weather";
  const weatherLat =
    typeof config?.weatherLat === "number" && Number.isFinite(config.weatherLat)
      ? config.weatherLat
      : 51.5074;
  const weatherLon =
    typeof config?.weatherLon === "number" && Number.isFinite(config.weatherLon)
      ? config.weatherLon
      : -0.1278;
  return { weatherLocation, weatherLat, weatherLon };
}

export function parseDeviceStatusConfig(
  config: Record<string, unknown> | undefined
): { offlineOnly: boolean } {
  return { offlineOnly: config?.offlineOnly === true };
}

export function generalDefaultSize(type: GeneralWidgetType): { w: number; h: number } {
  switch (type) {
    case "calendar":
      return { w: 4, h: 4 };
    case "weather":
      return { w: 4, h: 4 };
    case "system_info":
      return { w: 4, h: 3 };
    case "device_status":
      return { w: 4, h: 4 };
    default:
      return { w: 4, h: 3 };
  }
}

export function generalDefaultConfig(type: GeneralWidgetType): Record<string, unknown> {
  switch (type) {
    case "weather":
      return {
        weatherLocation: "London",
        weatherLat: 51.5074,
        weatherLon: -0.1278,
      };
    case "device_status":
      return { offlineOnly: false };
    default:
      return {};
  }
}

export function widgetTitleOr(
  widget: WidgetInstance,
  fallback: string
): string | undefined {
  const t = widget.title?.trim();
  if (!t || t === fallback || t === widget.type) return undefined;
  return t;
}
