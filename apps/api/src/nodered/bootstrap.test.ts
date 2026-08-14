import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { countFlowTabs, flowsNeedBootstrap, patchFlowTemplateNodes } from "./bootstrap.js";

test("flowsNeedBootstrap detects empty or missing flows", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nr-"));
  const flowsPath = path.join(tmp, "flows.json");

  assert.equal(flowsNeedBootstrap(flowsPath), true);
  fs.writeFileSync(flowsPath, "[]", "utf8");
  assert.equal(flowsNeedBootstrap(flowsPath), true);
  fs.writeFileSync(
    flowsPath,
    JSON.stringify([{ id: "t1", type: "tab", label: "Main" }]),
    "utf8"
  );
  assert.equal(flowsNeedBootstrap(flowsPath), false);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("countFlowTabs counts tab nodes only", () => {
  assert.equal(
    countFlowTabs([
      { type: "tab" },
      { type: "mqtt in" },
      { type: "tab" },
    ]),
    2
  );
});

test("patchFlowTemplateNodes injects MQTT and Influx settings", () => {
  const prev = {
    MQTT_TOPIC_PREFIX: process.env.MQTT_TOPIC_PREFIX,
    INFLUXDB_TOKEN: process.env.INFLUXDB_TOKEN,
    INFLUXDB_ORG: process.env.INFLUXDB_ORG,
    MQTT_USERNAME: process.env.MQTT_USERNAME,
    MQTT_PASSWORD: process.env.MQTT_PASSWORD,
  };
  process.env.MQTT_TOPIC_PREFIX = "nexternel";
  process.env.INFLUXDB_TOKEN = "test-token";
  process.env.INFLUXDB_ORG = "nexternel";
  process.env.MQTT_USERNAME = "nexternel";
  process.env.MQTT_PASSWORD = "secret";

  try {
    const patched = patchFlowTemplateNodes([
      { type: "mqtt-broker", id: "b1" },
      { type: "mqtt in", topic: "damnhome/#" },
      {
        type: "function",
        func: 'const token = "REPLACE_WITH_INFLUXDB_TOKEN";\nconst org = "damnhome";',
      },
    ]);
    assert.equal(patched[0]!.username, "nexternel");
    assert.equal(patched[1]!.topic, "nexternel/#");
    assert.ok((patched[2]!.func as string).includes("test-token"));
  } finally {
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
