import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateEsphomeYaml } from "./generate.js";
import {
  normalizeBuilderConfig,
  validateEsphomeBuilderConfig,
} from "./validate.js";
import { parseManagedBuilderConfigFromYaml } from "./parse-config.js";
import { parseEsphomeYaml } from "../yaml.js";

const baseConfig = {
  version: 1 as const,
  platform: "esp32" as const,
  boardId: "esp32dev" as const,
  displayName: "Garden Controller",
  components: [
    {
      id: "climate",
      kind: "dht" as const,
      variant: "DHT22" as const,
      pin: 4,
    },
    {
      id: "light",
      kind: "gpio_switch" as const,
      pin: 16,
      name: "Garden Light",
      inverted: true,
    },
  ],
};

describe("esphome builder validate", () => {
  it("accepts a DHT + relay configuration", () => {
    const result = validateEsphomeBuilderConfig(baseConfig);
    assert.equal(result.valid, true);
    assert.equal(result.issues.length, 0);
  });

  it("rejects duplicate GPIO pins", () => {
    const result = validateEsphomeBuilderConfig({
      ...baseConfig,
      components: [
        { id: "a", kind: "dht", variant: "DHT22", pin: 4 },
        { id: "b", kind: "gpio_switch", pin: 4, name: "Relay" },
      ],
    });
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((i) => i.code === "duplicate_pin"));
  });
});

describe("esphome builder generate", () => {
  it("generates PMS UART and particulate sensors", () => {
    const config = normalizeBuilderConfig({
      ...baseConfig,
      components: [
        {
          id: "pms",
          kind: "pms" as const,
          variant: "PMSX003" as const,
          uartTxPin: 12,
          uartRxPin: 13,
        },
      ],
    });
    const yaml = generateEsphomeYaml(config);
    assert.match(yaml, /uart:/);
    assert.match(yaml, /platform: pmsx003/);
    const parsed = parseEsphomeYaml(yaml, "garden-controller", "garden-controller");
    assert.equal(parsed.sensors.length, 3);
  });

  it("generates pulse meter energy sensors and SNTP time", () => {
    const config = normalizeBuilderConfig({
      ...baseConfig,
      components: [
        {
          id: "energy",
          kind: "pulse_meter" as const,
          pin: 12,
          pulseRate: 1000,
        },
      ],
    });
    const yaml = generateEsphomeYaml(config);
    assert.match(yaml, /platform: pulse_meter/);
    assert.match(yaml, /platform: total_daily_energy/);
    assert.match(yaml, /platform: sntp/);
    const parsed = parseEsphomeYaml(yaml, "garden-controller", "garden-controller");
    assert.equal(parsed.sensors.length, 3);
  });

  it("generates secrets-based MQTT and round-trips through the parser", () => {
    const config = normalizeBuilderConfig(baseConfig);
    const yaml = generateEsphomeYaml(config);
    assert.match(yaml, /broker: !secret mqtt_broker/);
    assert.match(yaml, /platform: dht/);
    assert.match(yaml, /platform: gpio/);
    assert.match(yaml, /topic_prefix: nexternel\/garden-controller/);

    const parsed = parseEsphomeYaml(yaml, "garden-controller", "devices/garden-controller");
    assert.equal(parsed.sensors.length, 2);
    assert.equal(parsed.relays.length, 1);
    assert.equal(parsed.esphomeName, "garden-controller");
  });

  it("parses builder YAML back into managed config", () => {
    const config = normalizeBuilderConfig(baseConfig);
    const yaml = generateEsphomeYaml(config);
    const roundTrip = parseManagedBuilderConfigFromYaml(
      yaml,
      "garden-controller",
      "Garden Controller"
    );
    assert.ok(roundTrip);
    assert.equal(roundTrip!.components.length, 2);
    assert.equal(roundTrip!.components[0]?.kind, "dht");
    assert.equal(roundTrip!.components[1]?.kind, "gpio_switch");
  });
});
