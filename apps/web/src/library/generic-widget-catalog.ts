import type { GenericWidgetType } from "@/types/dashboard";
import { GENERIC_WIDGET_DEFAULTS } from "@/types/dashboard";

export const GENERIC_WIDGET_LIBRARY = [
  {
    id: "time" as GenericWidgetType,
    label: "Clock",
    description: "Digital or analog clock with optional seconds.",
    icon: "clock",
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "Month view with today highlighted.",
    icon: "calendar",
  },
  {
    id: "weather",
    label: "Weather",
    description: "Live temperature, humidity, and wind (Open-Meteo).",
    icon: "cloud",
  },
  {
    id: "system_info",
    label: "System information",
    description: "Server version, uptime, CPU, RAM, and temperature.",
    icon: "cpu",
  },
  {
    id: "activity_log",
    label: "Activity log",
    description: "Relay toggles, dashboard events, and system messages.",
    icon: "list",
  },
  {
    id: "network_status",
    label: "Network status",
    description: "Server IP addresses and device connectivity.",
    icon: "wifi",
  },
  {
    id: "speed_test",
    label: "Internet speed test",
    description: "Download speed gauge with LAN and WAN IP addresses (auto-tested every few minutes).",
    icon: "gauge",
  },
] as const;

export function getGenericWidgetDefaults(id: GenericWidgetType) {
  return GENERIC_WIDGET_DEFAULTS[id];
}
