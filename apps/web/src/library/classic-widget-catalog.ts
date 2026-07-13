import type { WidgetType } from "@/types/dashboard";
import { WIDGET_TYPE_LABELS } from "@/types/dashboard";

/** Classic dashboard widgets (add via Edit dashboard → Classic widgets). */
export const CLASSIC_WIDGET_LIBRARY: {
  id: WidgetType;
  label: string;
  description: string;
  defaultColSpan: number;
  defaultRowSpan: number;
}[] = [
  {
    id: "sensor",
    label: WIDGET_TYPE_LABELS.sensor,
    description: "One sensor card with optional chart and live status.",
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "relay",
    label: WIDGET_TYPE_LABELS.relay,
    description: "Toggle a relay or switch from the dashboard.",
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "room_sensors",
    label: WIDGET_TYPE_LABELS.room_sensors,
    description: "All sensors assigned to one area in a single widget.",
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "device_sensors",
    label: WIDGET_TYPE_LABELS.device_sensors,
    description: "Every reading from one ESP32 device (e.g. temp + humidity).",
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "device_relays",
    label: WIDGET_TYPE_LABELS.device_relays,
    description: "Every relay/switch from one ESP32 device in a single widget.",
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
  {
    id: "device_status",
    label: WIDGET_TYPE_LABELS.device_status,
    description: "Online / offline status for all registered devices.",
    defaultColSpan: 1,
    defaultRowSpan: 1,
  },
];
