import assert from "node:assert/strict";
import { test } from "node:test";
import { extractEsphomeMqttCredential } from "./detect-esphome-mqtt-credentials.js";

const SAMPLE = `
substitutions:
  device_name: air-quality
  mqtt_broker: "192.168.3.101"
  mqtt_username: "damn_nexternel"
  mqtt_password: "n3v3rm1nd"

esphome:
  name: air-quality
`;

test("extractEsphomeMqttCredential reads substitutions mqtt_username", () => {
  const cred = extractEsphomeMqttCredential("air-quality.yaml", SAMPLE);
  assert.equal(cred?.username, "damn_nexternel");
  assert.equal(cred?.password, "n3v3rm1nd");
});

test("extractEsphomeMqttCredential reads secrets.yaml", () => {
  const cred = extractEsphomeMqttCredential(
    "secrets.yaml",
    `mqtt_username: damn_nexternel\nmqtt_password: secret_pass\n`
  );
  assert.equal(cred?.username, "damn_nexternel");
  assert.equal(cred?.password, "secret_pass");
});
