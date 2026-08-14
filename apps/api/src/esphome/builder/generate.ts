import {
  boardCatalogEntry,
  type BuilderComponent,
  type EsphomeDeviceBuilderConfig,
} from "@nexternel/domain";
import { installationMqttRoot } from "../../migrate/align-mqtt-topics.js";
import { esphomeObjectIdFromName } from "../yaml.js";
import { resolveBuilderSlug } from "./validate.js";

function entityBase(slug: string, component: BuilderComponent): string {
  if (component.kind === "gpio_switch") {
    const fromName = esphomeObjectIdFromName(component.name);
    return fromName || `${slug}_${component.id}`;
  }
  return `${slug}_${component.id}`;
}

function yamlQuote(value: string): string {
  if (/^[a-zA-Z0-9 _.-]+$/.test(value)) return `"${value}"`;
  return JSON.stringify(value);
}

function platformBlock(config: EsphomeDeviceBuilderConfig): string {
  const board = boardCatalogEntry(config.boardId);
  if (!board) throw new Error(`Unknown board: ${config.boardId}`);
  if (config.platform === "esp8266") {
    return `esp8266:
  board: ${board.esphomeBoard}
  framework:
    version: recommended`;
  }
  return `esp32:
  board: ${board.esphomeBoard}
  framework:
    type: arduino`;
}

function renderDhtSensor(
  slug: string,
  displayName: string,
  component: Extract<BuilderComponent, { kind: "dht" }>
): string {
  const base = entityBase(slug, component);
  const interval = component.updateIntervalSeconds ?? 60;
  const tempName = `${displayName} Temperature`;
  const humName = `${displayName} Humidity`;
  return `  - platform: dht
    pin: GPIO${component.pin}
    model: ${component.variant}
    temperature:
      name: ${yamlQuote(tempName)}
      id: ${base}_temperature
      unit_of_measurement: "°C"
      accuracy_decimals: 1
    humidity:
      name: ${yamlQuote(humName)}
      id: ${base}_humidity
      unit_of_measurement: "%"
      accuracy_decimals: 0
    update_interval: ${interval}s`;
}

function renderGpioSwitch(
  component: Extract<BuilderComponent, { kind: "gpio_switch" }>,
  slug: string
): string {
  const entityId = entityBase(slug, component);
  const inverted = component.inverted !== false;
  return `  - platform: gpio
    pin: GPIO${component.pin}
    name: ${yamlQuote(component.name)}
    id: ${entityId}
    inverted: ${inverted ? "true" : "false"}
    restore_mode: RESTORE_DEFAULT_OFF`;
}

function renderUartBlock(component: Extract<BuilderComponent, { kind: "pms" }>): string {
  return `  - id: uart_${component.id}
    tx_pin: GPIO${component.uartTxPin}
    rx_pin: GPIO${component.uartRxPin}
    baud_rate: 9600`;
}

function renderPmsSensor(
  slug: string,
  displayName: string,
  component: Extract<BuilderComponent, { kind: "pms" }>
): string {
  const base = entityBase(slug, component);
  const interval = component.updateIntervalSeconds ?? 60;
  return `  - platform: pmsx003
    type: ${component.variant}
    uart_id: uart_${component.id}
    update_interval: ${interval}s
    pm_1_0:
      name: ${yamlQuote(`${displayName} PM1`)}
      id: ${base}_pm1
    pm_2_5:
      name: ${yamlQuote(`${displayName} PM2.5`)}
      id: ${base}_pm25
    pm_10_0:
      name: ${yamlQuote(`${displayName} PM10`)}
      id: ${base}_pm10`;
}

function installationTimezone(): string {
  const tz = process.env.TZ?.trim();
  return tz && tz.includes("/") ? tz : "Europe/London";
}

function renderPulseMeter(
  slug: string,
  displayName: string,
  component: Extract<BuilderComponent, { kind: "pulse_meter" }>
): string[] {
  const base = entityBase(slug, component);
  const rate = component.pulseRate;
  return [
    `  - platform: pulse_meter
    name: ${yamlQuote(`${displayName} Power`)}
    id: ${base}_power
    pin: GPIO${component.pin}
    unit_of_measurement: "W"
    device_class: power
    state_class: measurement
    accuracy_decimals: 0
    filters:
      - lambda: return x * ((60.0 / ${rate}) * 1000.0);
    total:
      name: ${yamlQuote(`${displayName} Total Energy`)}
      id: ${base}_total
      unit_of_measurement: "kWh"
      device_class: energy
      state_class: total_increasing
      accuracy_decimals: 3
      filters:
        - lambda: return x * (1.0 / ${rate});`,
    `  - platform: total_daily_energy
    name: ${yamlQuote(`${displayName} Daily Energy`)}
    id: ${base}_daily
    power_id: ${base}_power
    unit_of_measurement: "kWh"
    device_class: energy
    state_class: total_increasing
    accuracy_decimals: 3
    filters:
      - multiply: 0.001`,
  ];
}

/**
 * Generate ESPHome YAML for a managed device.
 * Wi-Fi and MQTT credentials use server-side secrets — not embedded in the form.
 */
export function generateEsphomeYaml(config: EsphomeDeviceBuilderConfig): string {
  const slug = resolveBuilderSlug(config);
  const board = boardCatalogEntry(config.boardId);
  if (!board) throw new Error(`Unknown board: ${config.boardId}`);

  const mqttRoot = installationMqttRoot();
  const mqttTopicPrefix = `${mqttRoot}/${slug}`;
  const displayName = config.displayName.trim();

  const sensorBlocks: string[] = [];
  const switchBlocks: string[] = [];
  const uartBlocks: string[] = [];
  let needsTime = false;

  for (const component of config.components) {
    if (component.kind === "dht") {
      sensorBlocks.push(renderDhtSensor(slug, displayName, component));
    } else if (component.kind === "gpio_switch") {
      switchBlocks.push(renderGpioSwitch(component, slug));
    } else if (component.kind === "pms") {
      uartBlocks.push(renderUartBlock(component));
      sensorBlocks.push(renderPmsSensor(slug, displayName, component));
    } else if (component.kind === "pulse_meter") {
      needsTime = true;
      sensorBlocks.push(...renderPulseMeter(slug, displayName, component));
    }
  }

  const lines = [
    "# Nexternel managed device — generated by Device Builder.",
    "# Advanced users may edit via Devices → Advanced; YAML may become authoritative.",
    `# Device: ${displayName}`,
    "",
    "substitutions:",
    `  device_name: ${slug}`,
    `  friendly_name: ${yamlQuote(displayName)}`,
    `  mqtt_topic_prefix: ${mqttTopicPrefix}`,
    "",
    "esphome:",
    `  name: "\${device_name}"`,
    `  friendly_name: "\${friendly_name}"`,
    "",
    platformBlock(config),
    "",
    "logger:",
    "",
    "api:",
    "",
    "ota:",
    "  - platform: esphome",
    "",
    "wifi:",
    "  ssid: !secret wifi_ssid",
    "  password: !secret wifi_password",
    "",
    "captive_portal:",
    "",
    "mqtt:",
    "  broker: !secret mqtt_broker",
    "  port: 1883",
    "  username: !secret mqtt_username",
    "  password: !secret mqtt_password",
    `  topic_prefix: \${mqtt_topic_prefix}`,
    "  discovery: false",
    "",
  ];

  if (uartBlocks.length > 0) {
    lines.push("uart:", ...uartBlocks, "");
  }
  if (needsTime) {
    lines.push(
      "time:",
      "  - platform: sntp",
      "    id: sntp_time",
      `    timezone: ${installationTimezone()}`,
      ""
    );
  }
  if (sensorBlocks.length > 0) {
    lines.push("sensor:", ...sensorBlocks, "");
  }
  if (switchBlocks.length > 0) {
    lines.push("switch:", ...switchBlocks, "");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function builderYamlFileName(config: EsphomeDeviceBuilderConfig): string {
  return `${resolveBuilderSlug(config)}.yaml`;
}

export function builderYamlStem(config: EsphomeDeviceBuilderConfig): string {
  return resolveBuilderSlug(config);
}
