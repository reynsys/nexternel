import { test } from "node:test";
import assert from "node:assert/strict";
import {
  collectOldServerIp,
  collectOldTopicRoots,
  remapNoderedFileContent,
  remapNoderedServerIp,
} from "./nodered-remap.js";

test("replaces old Nexternel server IP in mqtt broker fields", () => {
  const input = `{"broker":"192.168.1.50","topic":"damnhome/sensor/temp"}`;
  const out = remapNoderedFileContent(input, {
    oldTopicRoots: ["damnhome"],
    newTopicRoot: "nexternel",
    oldServerIp: "192.168.1.50",
    newServerIp: "192.168.4.10",
  });
  assert.ok(out.includes("192.168.4.10"));
  assert.ok(!out.includes("192.168.1.50"));
  assert.ok(out.includes("nexternel/sensor/temp"));
});

test("does not replace unrelated device IP addresses", () => {
  const shellyIp = "192.168.1.120";
  const serverIp = "192.168.1.50";
  const input = `{"name":"shelly","device_ip":"${shellyIp}","broker":"${serverIp}"}`;
  const out = remapNoderedServerIp(input, serverIp, "192.168.4.10");
  assert.ok(out.includes(shellyIp), "Shelly device IP must be preserved");
  assert.ok(out.includes("192.168.4.10"));
  assert.ok(!out.includes(`"broker":"${serverIp}"`));
});

test("collectOldServerIp uses operational snapshot only", () => {
  assert.deepEqual(collectOldServerIp("10.0.0.5"), ["10.0.0.5"]);
  assert.deepEqual(collectOldServerIp(undefined), []);
});

test("collectOldTopicRoots derives from operational and domain prefixes", () => {
  const roots = collectOldTopicRoots("damnhome", ["damnhome/garden", "nexternel/foo"]);
  assert.ok(roots.includes("damnhome"));
  assert.ok(roots.includes("nexternel"));
  assert.equal(roots.includes("garden"), false);
});
