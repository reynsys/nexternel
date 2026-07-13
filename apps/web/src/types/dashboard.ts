export type WidgetType =

  | "sensor"

  | "relay"

  | "room_sensors"

  | "device_sensors"

  | "device_relays"

  | "device_status"

  | "library"

  | "time"

  | "calendar"

  | "weather"

  | "system_info"

  | "activity_log"

  | "network_status"

  | "speed_test";



import type { WidgetLibraryId } from "@/library/widget-catalog";
import type { WidgetPlatformInstance } from "@/widget-platform/types";



export type WidgetElementId =

  | "room_line"

  | "device_name"

  | "title"

  | "value"

  | "status"

  | "chart_button";



export type WidgetFontSize = "xs" | "sm" | "md" | "lg" | "xl";

export type WidgetShape = "default" | "sharp" | "pill" | "soft";

export type WidgetChartType = "line" | "area" | "bar";

export type WidgetReadingsLayout = "stack" | "grid-2" | "grid-3" | "inline";

export type RelaysPanelLayout = "list" | "grid-2" | "vertical" | "horizontal" | "round";

export type WidgetPadding = "compact" | "normal" | "roomy";

export type WidgetVariant = "default" | "filled" | "outline" | "glass";

export type TimeDisplayMode = "digital" | "analog";

export type AnalogClockStyle = "classic" | "minimal" | "roman";

export type DigitalClockStyle = "standard" | "mono" | "bold";

export type WidgetTitleMode = "title" | "icon" | "both";



export interface WidgetAppearanceConfig {

  fontSize?: WidgetFontSize;

  shape?: WidgetShape;

  chartType?: WidgetChartType;

  readingsLayout?: WidgetReadingsLayout;

  padding?: WidgetPadding;

  variant?: WidgetVariant;

  showBorder?: boolean;

  /** Widget heading: text only, icon only, or both */
  titleMode?: WidgetTitleMode;

  /** Icon key from widget-icons catalog */
  titleIcon?: string;

}



export interface WidgetDisplayConfig extends WidgetAppearanceConfig {

  /** Visible elements in top-to-bottom order */

  elements?: WidgetElementId[];

}



export const DEFAULT_SENSOR_ELEMENTS: WidgetElementId[] = [

  "room_line",

  "title",

  "value",

  "status",

  "chart_button",

];



export const DEFAULT_DEVICE_STATUS_ELEMENTS: WidgetElementId[] = ["title", "value"];



export const DEFAULT_RELAY_ELEMENTS: WidgetElementId[] = ["title", "value", "status"];



export const DEFAULT_DEVICE_SENSORS_ELEMENTS: WidgetElementId[] = [

  "room_line",

  "title",

  "value",

  "status",

  "chart_button",

];



export interface WidgetConfig {

  sensorId?: string;

  relayId?: string;

  roomId?: string;

  deviceId?: string;

  sensorIds?: string[];

  relayIds?: string[];

  relaysLayout?: RelaysPanelLayout;

  showChart?: boolean;

  display?: WidgetDisplayConfig;

  appearance?: WidgetAppearanceConfig;

  libraryId?: WidgetLibraryId;

  /** Generic: time widget */

  timeMode?: TimeDisplayMode;

  analogClockStyle?: AnalogClockStyle;

  digitalClockStyle?: DigitalClockStyle;

  showSeconds?: boolean;

  /** Generic: weather widget (Open-Meteo, no API key) */

  weatherLat?: number;

  weatherLon?: number;

  weatherLocation?: string;

  /** Generic: activity log */

  logLimit?: number;

  /** Visible console rows before scrolling */
  logVisibleRows?: number;

  logCategories?: string[];

  /** Generic: internet speed test interval (minutes) */
  speedTestIntervalMinutes?: number;

  /** Widget platform v1 — config-driven design (dual-read with legacy types) */
  platform?: WidgetPlatformInstance;
}



export interface DashboardWidgetDto {

  id: string;

  type: WidgetType;

  title: string | null;

  cell: string;

  colSpan: number;

  rowSpan: number;

  config: WidgetConfig;

}



export interface DashboardLayoutDto {

  id: string;

  name: string;

  columns: number;

  rows: number;

  widgets: DashboardWidgetDto[];

}



export interface DashboardLayoutSummary {

  id: string;

  name: string;

  isDefault: boolean;

  tabIcon?: string;

  showTabLabel?: boolean;

}



export const CLASSIC_WIDGET_TYPES: WidgetType[] = [

  "sensor",

  "relay",

  "room_sensors",

  "device_sensors",

  "device_relays",

  "device_status",

];



export const GENERIC_WIDGET_TYPES = [
  "time",
  "calendar",
  "weather",
  "system_info",
  "activity_log",
  "network_status",
  "speed_test",
] as const;

export type GenericWidgetType = (typeof GENERIC_WIDGET_TYPES)[number];



export const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {

  sensor: "Single sensor",

  relay: "Relay / switch",

  room_sensors: "Area (all sensors in location)",

  device_sensors: "All readings (one device)",

  device_relays: "All switches (one device)",

  device_status: "Device online status",

  library: "Library template",

  time: "Clock (digital / analog)",

  calendar: "Calendar",

  weather: "Weather forecast",

  system_info: "System information",

  activity_log: "Activity log",

  network_status: "Network status",

  speed_test: "Internet speed test",

};



export const WIDGET_ELEMENT_LABELS: Record<WidgetElementId, string> = {

  room_line: "Area · device line",

  device_name: "Device name",

  title: "Sensor name",

  value: "Numeric value",

  status: "Live / stale status",

  chart_button: "Show chart button",

};



export const GENERIC_WIDGET_DEFAULTS: Record<
  GenericWidgetType,
  { colSpan: number; rowSpan: number; config: WidgetConfig }
> = {

  time: {
    colSpan: 1,
    rowSpan: 1,
    config: {
      timeMode: "digital",
      digitalClockStyle: "standard",
      analogClockStyle: "classic",
      showSeconds: true,
    },
  },

  calendar: { colSpan: 1, rowSpan: 1, config: {} },

  weather: {
    colSpan: 1,
    rowSpan: 1,
    config: { weatherLat: 51.5074, weatherLon: -0.1278, weatherLocation: "London" },
  },

  system_info: { colSpan: 1, rowSpan: 1, config: {} },

  activity_log: { colSpan: 1, rowSpan: 1, config: { logLimit: 100, logVisibleRows: 8 } },

  network_status: { colSpan: 1, rowSpan: 1, config: {} },

  speed_test: { colSpan: 1, rowSpan: 1, config: { speedTestIntervalMinutes: 3 } },

};



export function isGenericWidgetType(type: WidgetType): type is GenericWidgetType {
  return (GENERIC_WIDGET_TYPES as readonly string[]).includes(type);
}



export function resolveWidgetAppearance(config?: WidgetConfig): WidgetAppearanceConfig {

  return { ...config?.appearance, ...stripAppearanceFromDisplay(config?.display) };

}



function stripAppearanceFromDisplay(display?: WidgetDisplayConfig): WidgetAppearanceConfig {

  if (!display) return {};

  const { elements: _e, ...appearance } = display;

  return appearance;

}



export function resolveWidgetElements(

  type: WidgetType,

  display?: WidgetDisplayConfig

): WidgetElementId[] {

  if (type === "library" || isGenericWidgetType(type)) return [];

  const defaults: WidgetElementId[] =

    type === "device_status"

      ? DEFAULT_DEVICE_STATUS_ELEMENTS

      : type === "relay"

        ? DEFAULT_RELAY_ELEMENTS

        : type === "device_sensors"

          ? DEFAULT_DEVICE_SENSORS_ELEMENTS

          : type === "device_relays"

            ? DEFAULT_RELAY_ELEMENTS

          : DEFAULT_SENSOR_ELEMENTS;

  return display?.elements?.length ? display.elements : defaults;

}


