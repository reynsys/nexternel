import {
  Activity,
  Droplets,
  Gauge,
  Lightbulb,
  Power,
  Thermometer,
  type LucideIcon,
  Wifi,
} from "lucide-react";

const ICON_BY_SENSOR_TYPE: Record<string, LucideIcon> = {
  temperature: Thermometer,
  humidity: Droplets,
  pressure: Gauge,
  co2: Activity,
  light: Lightbulb,
  signal: Wifi,
};

export function iconForSensorType(sensorType: string): LucideIcon {
  return ICON_BY_SENSOR_TYPE[sensorType.toLowerCase()] ?? Activity;
}

export const RELAY_ICON = Power;
