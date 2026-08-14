import { access } from "fs/promises";
import { join } from "path";
import { getPool } from "../db.js";
import { listDevicesDetailed } from "../devices/service.js";
import { refreshTelemetrySubscriptions } from "../telemetry/mqtt.js";
import { loadEsphomeYaml } from "./yaml.js";

const ESPHOME_DIRS = ["/esphome", join(process.cwd(), "..", "..", "esphome")];

async function esphomeDirReadable(): Promise<boolean> {
  for (const dir of ESPHOME_DIRS) {
    try {
      await access(dir);
      return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

async function yamlExistsForStem(stem: string): Promise<boolean> {
  const yaml = await loadEsphomeYaml(stem);
  return Boolean(yaml);
}

async function yamlExistsForDevice(device: {
  esphomeName: string | null;
  slug: string;
  mqttTopicPrefix: string;
  esphomeYamlPath?: string | null;
}): Promise<boolean> {
  const pathStem = device.esphomeYamlPath?.trim().replace(/\.yaml$/, "").replace(/^devices\//, "");
  const candidates = [
    pathStem,
    device.esphomeName?.trim(),
    device.slug?.trim(),
    device.mqttTopicPrefix?.split("/").pop()?.trim(),
  ].filter((c): c is string => Boolean(c));

  const tried = new Set<string>();
  for (const stem of candidates) {
    if (tried.has(stem)) continue;
    tried.add(stem);
    if (await yamlExistsForStem(stem)) return true;
  }
  return false;
}

/**
 * Remove ESPHome device rows whose YAML no longer exists on the server
 * (e.g. deleted from the ESPHome dashboard). Skips when the config folder
 * is not readable to avoid mass deletion on a mount failure.
 */
export async function pruneEsphomeDevicesMissingYaml(): Promise<{
  removed: { id: string; name: string }[];
}> {
  if (!(await esphomeDirReadable())) {
    return { removed: [] };
  }

  const devices = await listDevicesDetailed();
  const removed: { id: string; name: string }[] = [];

  for (const device of devices) {
    if ((device.firmwareType || "esphome") !== "esphome") continue;
    if (await yamlExistsForDevice(device)) continue;

    const result = await getPool().query(`DELETE FROM devices WHERE id = $1 RETURNING id`, [
      device.id,
    ]);
    if ((result.rowCount ?? 0) > 0) {
      removed.push({ id: device.id, name: device.name });
    }
  }

  if (removed.length > 0) {
    await refreshTelemetrySubscriptions();
  }

  return { removed };
}
