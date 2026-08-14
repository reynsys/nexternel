/**
 * Nexternel-managed ESPHome device builder — shared contracts (Phase 1).
 * Source of truth for Mode A (managed): DeviceBuilderConfig → generated YAML → capabilities.
 */

export const ESPHOME_BUILDER_CONFIG_VERSION = 1 as const;

export type EsphomePlatform = "esp32" | "esp8266";

export type EsphomeBoardId =
  | "esp32dev"
  | "esp32-c3-devkitm-1"
  | "nodemcuv2"
  | "esp01_1m";

/** How Nexternel relates to the ESPHome configuration for this device. */
export type EsphomeManagementMode = "managed" | "imported" | "advanced";

/** Device lifecycle for builder-managed ESPHome devices. */
export type EsphomeLifecycleState =
  | "draft"
  | "configured"
  | "validation_failed"
  | "ready_to_build"
  | "building"
  | "firmware_ready"
  | "awaiting_installation"
  | "connecting"
  | "online"
  | "offline"
  | "error";

export type BuilderComponentKind = "dht" | "gpio_switch";

export type DhtVariant = "DHT11" | "DHT22" | "DHT21";

export type DhtBuilderComponent = {
  id: string;
  kind: "dht";
  variant: DhtVariant;
  /** GPIO number (e.g. 4 → GPIO4). */
  pin: number;
  updateIntervalSeconds?: number;
};

export type GpioSwitchBuilderComponent = {
  id: string;
  kind: "gpio_switch";
  pin: number;
  name: string;
  inverted?: boolean;
};

export type BuilderComponent = DhtBuilderComponent | GpioSwitchBuilderComponent;

/** Structured device definition — authoritative for managed devices. */
export type EsphomeDeviceBuilderConfig = {
  version: typeof ESPHOME_BUILDER_CONFIG_VERSION;
  platform: EsphomePlatform;
  boardId: EsphomeBoardId;
  displayName: string;
  /** ESPHome node name / YAML stem; generated from displayName when omitted. */
  slug?: string;
  description?: string;
  roomId?: string | null;
  components: BuilderComponent[];
};

export type BuilderFieldType = "number" | "string" | "select" | "boolean";

export type BuilderFieldDef = {
  key: string;
  label: string;
  type: BuilderFieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  defaultValue?: string | number | boolean;
  help?: string;
};

export type BuilderComponentCatalogEntry = {
  id: BuilderComponentKind;
  category: "sensor" | "actuator";
  label: string;
  description: string;
  platforms: EsphomePlatform[];
  fields: BuilderFieldDef[];
  /** Capability kinds created (for UI preview). */
  createsCapabilities: { kind: string; label: string }[];
};

export type EsphomeBoardCatalogEntry = {
  id: EsphomeBoardId;
  platform: EsphomePlatform;
  label: string;
  description: string;
  /** ESPHome `board:` value passed to generated YAML. */
  esphomeBoard: string;
  /** Inclusive GPIO range for validation (simplified). */
  gpioMin: number;
  gpioMax: number;
};

export const ESPHOME_BOARD_CATALOG: EsphomeBoardCatalogEntry[] = [
  {
    id: "esp32dev",
    platform: "esp32",
    label: "ESP32 DevKit",
    description: "Generic ESP32 development board (WROOM/WROVER)",
    esphomeBoard: "esp32dev",
    gpioMin: 0,
    gpioMax: 39,
  },
  {
    id: "esp32-c3-devkitm-1",
    platform: "esp32",
    label: "ESP32-C3 DevKitM-1",
    description: "Espressif ESP32-C3 USB development board",
    esphomeBoard: "esp32-c3-devkitm-1",
    gpioMin: 0,
    gpioMax: 21,
  },
  {
    id: "nodemcuv2",
    platform: "esp8266",
    label: "NodeMCU v2",
    description: "ESP8266 NodeMCU development board",
    esphomeBoard: "nodemcuv2",
    gpioMin: 0,
    gpioMax: 16,
  },
  {
    id: "esp01_1m",
    platform: "esp8266",
    label: "ESP-01 (1 MB)",
    description: "ESP8266 ESP-01 module with 1 MB flash",
    esphomeBoard: "esp01_1m",
    gpioMin: 0,
    gpioMax: 16,
  },
];

export const ESPHOME_COMPONENT_CATALOG: BuilderComponentCatalogEntry[] = [
  {
    id: "dht",
    category: "sensor",
    label: "DHT temperature / humidity",
    description: "DHT11, DHT21, or DHT22 on one data pin",
    platforms: ["esp32", "esp8266"],
    createsCapabilities: [
      { kind: "temperature", label: "Temperature" },
      { kind: "humidity", label: "Humidity" },
    ],
    fields: [
      {
        key: "variant",
        label: "Sensor type",
        type: "select",
        required: true,
        options: [
          { value: "DHT22", label: "DHT22" },
          { value: "DHT11", label: "DHT11" },
          { value: "DHT21", label: "DHT21" },
        ],
        defaultValue: "DHT22",
      },
      {
        key: "pin",
        label: "Data pin (GPIO)",
        type: "number",
        required: true,
        min: 0,
        max: 39,
        help: "GPIO number connected to the DHT data line",
      },
      {
        key: "updateIntervalSeconds",
        label: "Update interval (seconds)",
        type: "number",
        required: false,
        min: 10,
        max: 600,
        defaultValue: 60,
      },
    ],
  },
  {
    id: "gpio_switch",
    category: "actuator",
    label: "Relay / GPIO switch",
    description: "Single relay or switch on a GPIO pin",
    platforms: ["esp32", "esp8266"],
    createsCapabilities: [{ kind: "switch", label: "Switch" }],
    fields: [
      {
        key: "name",
        label: "Display name",
        type: "string",
        required: true,
        help: "Shown in Nexternel and on the device",
      },
      {
        key: "pin",
        label: "GPIO pin",
        type: "number",
        required: true,
        min: 0,
        max: 39,
      },
      {
        key: "inverted",
        label: "Active low (typical relay modules)",
        type: "boolean",
        defaultValue: true,
      },
    ],
  },
];

export function boardCatalogEntry(
  boardId: EsphomeBoardId
): EsphomeBoardCatalogEntry | undefined {
  return ESPHOME_BOARD_CATALOG.find((b) => b.id === boardId);
}

export function componentCatalogEntry(
  kind: BuilderComponentKind
): BuilderComponentCatalogEntry | undefined {
  return ESPHOME_COMPONENT_CATALOG.find((c) => c.id === kind);
}
