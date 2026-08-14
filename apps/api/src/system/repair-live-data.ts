import path from "path";
import fs from "fs";
import { syncCapabilitiesFromLegacy } from "../capabilities/sync.js";
import { config } from "../config.js";
import {
  detectBrokerIpFromSecretsYaml,
  rewriteEsphomeForCurrentServer,
} from "../backup/esphome-cutover.js";
import {
  collectOldTopicRoots,
  remapNoderedArchive,
} from "../backup/nodered-remap.js";
import { restartNexternelServices } from "../backup/post-restore.js";
import { noderedDataDir } from "../backup/paths.js";
import { getPool } from "../db.js";
import { buildConfigPayload } from "../migrate/export-config.js";
import {
  applyLegacyTopicRootToPayload,
  remapTopicForLegacyRoots,
} from "../migrate/topic-remap.js";
import { listEsphomeFiles, writeFileEnsured, isDirectory } from "../migrate/paths.js";
import { repairDashboardCapabilityBindings } from "../migrate/repair-dashboard-bindings.js";
import {
  getMqttStatus,
  refreshTelemetrySubscriptions,
  startTelemetry,
} from "../telemetry/mqtt.js";

const NODERED_FILES = [
  "flows.json",
  "flows_cred.json",
  "settings.js",
  "package.json",
  ".config.nodes.json",
  ".config.runtime.json",
  ".config.users.json",
];

export type RepairLivePhase = {
  name: string;
  ok: boolean;
  message?: string;
};

export type RepairLiveResult = {
  ok: boolean;
  message: string;
  phases: RepairLivePhase[];
};

function readLiveNoderedFiles(): { rel: string; data: Buffer }[] {
  const root = noderedDataDir();
  if (!isDirectory(root)) return [];
  const out: { rel: string; data: Buffer }[] = [];
  for (const name of NODERED_FILES) {
    try {
      const data = fs.readFileSync(path.join(root, name));
      out.push({ rel: name, data });
    } catch {
      /* optional file */
    }
  }
  return out;
}

function detectLiveOldBrokerIp(): string {
  const current = (config.serverIp() || "").trim();
  for (const { rel, data } of listEsphomeFiles()) {
    if (!/secrets\.ya?ml$/i.test(rel)) continue;
    const ip = detectBrokerIpFromSecretsYaml(data.toString("utf8"));
    if (ip && current && ip !== current) return ip;
  }
  return "";
}

export async function remapStoredDeviceMqttTopics(): Promise<{
  devicesUpdated: number;
  topicRoot: string;
  legacyRoots: string[];
}> {
  const topicRoot =
    (process.env.MQTT_TOPIC_PREFIX || "nexternel").trim() || "nexternel";
  const payload = await buildConfigPayload();
  const legacyRoots = collectOldTopicRoots(
    undefined,
    payload.devices.map((d) => d.mqttTopicPrefix)
  ).filter((r) => r !== topicRoot);

  if (legacyRoots.length === 0) {
    return { devicesUpdated: 0, topicRoot, legacyRoots };
  }

  const remapped = applyLegacyTopicRootToPayload(payload, topicRoot, legacyRoots);
  const pool = getPool();
  let devicesUpdated = 0;

  for (let i = 0; i < payload.devices.length; i++) {
    const before = payload.devices[i]!;
    const after = remapped.devices[i]!;
    const changed =
      before.mqttTopicPrefix !== after.mqttTopicPrefix ||
      before.sensors.some(
        (s, j) => s.mqttStateTopic !== after.sensors[j]!.mqttStateTopic
      ) ||
      before.relays.some(
        (r, j) =>
          r.mqttStateTopic !== after.relays[j]!.mqttStateTopic ||
          r.mqttCommandTopic !== after.relays[j]!.mqttCommandTopic
      );
    if (!changed) continue;

    await pool.query(
      `UPDATE devices SET mqtt_topic_prefix = $2, updated_at = NOW() WHERE id = $1::uuid`,
      [after.id, after.mqttTopicPrefix]
    );
    for (const s of after.sensors) {
      await pool.query(`UPDATE sensors SET mqtt_state_topic = $2 WHERE id = $1::uuid`, [
        s.id,
        s.mqttStateTopic,
      ]);
    }
    for (const r of after.relays) {
      await pool.query(
        `UPDATE relays SET mqtt_state_topic = $2, mqtt_command_topic = $3 WHERE id = $1::uuid`,
        [r.id, r.mqttStateTopic, r.mqttCommandTopic]
      );
    }
    devicesUpdated += 1;
  }

  return { devicesUpdated, topicRoot, legacyRoots };
}

function remapLiveNoderedFiles(
  legacyRoots: string[],
  oldBrokerIp: string
): number {
  const currentServerIp = (config.serverIp() || "").trim();
  const currentTopic =
    (process.env.MQTT_TOPIC_PREFIX || "nexternel").trim() || "nexternel";
  if (!currentServerIp) return 0;

  const files = readLiveNoderedFiles();
  if (files.length === 0) return 0;

  const remapped = remapNoderedArchive(files, {
    oldTopicRoots: legacyRoots,
    newTopicRoot: currentTopic,
    oldServerIp: oldBrokerIp || undefined,
    newServerIp: currentServerIp,
  });

  let count = 0;
  const root = noderedDataDir();
  for (const f of remapped) {
    const orig = files.find((x) => x.rel === f.rel);
    if (orig && orig.data.equals(f.data)) continue;
    writeFileEnsured(path.join(root, f.rel), f.data);
    count += 1;
  }
  return count;
}

/** Realign stored topics, device YAML, automations, and live telemetry for this server. */
export async function repairLiveData(): Promise<RepairLiveResult> {
  const phases: RepairLivePhase[] = [];

  let legacyRoots: string[] = [];
  try {
    const topicResult = await remapStoredDeviceMqttTopics();
    legacyRoots = topicResult.legacyRoots;
    phases.push({
      name: "MQTT topics",
      ok: true,
      message:
        topicResult.devicesUpdated > 0
          ? `${topicResult.devicesUpdated} device(s) remapped to ${topicResult.topicRoot}`
          : topicResult.legacyRoots.length > 0
            ? `Already using ${topicResult.topicRoot}`
            : "No legacy topic roots found",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    phases.push({ name: "MQTT topics", ok: false, message: msg });
  }

  const payload = await buildConfigPayload();
  const oldBrokerIp = detectLiveOldBrokerIp();

  try {
    const yamlCount = rewriteEsphomeForCurrentServer({
      oldBrokerIp,
      devices: payload.devices,
    });
    phases.push({
      name: "Device configuration",
      ok: true,
      message: `${yamlCount} YAML file(s) updated for this server`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    phases.push({ name: "Device configuration", ok: false, message: msg });
  }

  try {
    const noderedCount = remapLiveNoderedFiles(legacyRoots, oldBrokerIp);
    phases.push({
      name: "Automations",
      ok: true,
      message:
        noderedCount > 0
          ? `${noderedCount} automation file(s) updated`
          : "No automation changes needed",
    });
    if (noderedCount > 0) {
      const restart = await restartNexternelServices("automations");
      if (!restart.ok) {
        phases.push({
          name: "Restart automations",
          ok: false,
          message: restart.message,
        });
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    phases.push({ name: "Automations", ok: false, message: msg });
  }

  try {
    const { reconcileAllEsphomeDevicesFromYaml } = await import(
      "../devices/service.js"
    );
    const reconciled = await reconcileAllEsphomeDevicesFromYaml();
    phases.push({
      name: "ESPHome reconcile",
      ok: reconciled.errors === 0,
      message: `${reconciled.reconciled} reconciled, ${reconciled.skipped} skipped`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    phases.push({ name: "ESPHome reconcile", ok: false, message: msg });
  }

  try {
    const sync = await syncCapabilitiesFromLegacy();
    const repaired = await repairDashboardCapabilityBindings();
    await refreshTelemetrySubscriptions();
    await startTelemetry();
    phases.push({
      name: "Live telemetry",
      ok: true,
      message: `${sync.sensors + sync.relays} capabilities synced, ${repaired.bindingsRemapped} dashboard binding(s) repaired`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    phases.push({ name: "Live telemetry", ok: false, message: msg });
  }

  const mqtt = getMqttStatus();
  const failed = phases.filter((p) => !p.ok);
  const ok = failed.length === 0 && mqtt.status === "connected";

  let message = ok
    ? "Live device repair completed. Refresh dashboards and Live."
    : failed.length > 0
      ? `Repair finished with issues: ${failed.map((p) => p.name).join(", ")}`
      : mqtt.lastError || "MQTT is not connected — use Repair MQTT connection first.";

  const esphomeCount = payload.devices.filter(
    (d) => d.firmwareType === "esphome"
  ).length;
  if (ok && esphomeCount > 0) {
    message +=
      " ESPHome boards may need a one-time OTA update from the ESPHome dashboard if switches still do not respond.";
  }

  return { ok, message, phases };
}

export { remapTopicForLegacyRoots };
