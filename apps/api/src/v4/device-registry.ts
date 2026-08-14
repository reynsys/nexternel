import type { SystemId } from "@nexternel/domain";
import { getPool } from "../db.js";
import { suggestFromEsphome } from "../esphome/yaml.js";
import {
  createDevice,
  getDeviceDetailed,
  syncDeviceFromEsphomeSuggestion,
} from "../devices/service.js";
import { refreshTelemetrySubscriptions } from "../telemetry/mqtt.js";
import { buildEsphomeDriverManifest } from "./drivers/esphome.js";
import {
  mapCandidatesToCapabilities,
  syncAndClassifyCapabilities,
} from "./capability-mapper.js";
import type { DriverManifest } from "./types.js";

export type OnboardEsphomeInput = {
  yamlName: string;
  name?: string;
  roomId?: string | null;
  deviceId?: string;
  systemOverrides?: Record<string, SystemId>;
};

export type OnboardEsphomeResult = {
  deviceId: string;
  manifest: DriverManifest;
  mapped: ReturnType<typeof mapCandidatesToCapabilities>;
  sync: { sensors: number; relays: number };
  classified: number;
  created: boolean;
};

export async function previewEsphomeOnboarding(
  yamlName: string,
  roomId?: string | null
): Promise<{
  manifest: DriverManifest;
  mapped: ReturnType<typeof mapCandidatesToCapabilities>;
} | null> {
  const suggestion = await suggestFromEsphome(yamlName);
  if (!suggestion) return null;

  const manifest = buildEsphomeDriverManifest(suggestion);
  let areaName: string | null = null;
  if (roomId) {
    const room = await getPool().query<{ name: string }>(
      `SELECT name FROM rooms WHERE id = $1`,
      [roomId]
    );
    areaName = room.rows[0]?.name ?? null;
  }

  const mapped = mapCandidatesToCapabilities(manifest.candidates, {
    deviceName: suggestion.esphomeName,
    areaName,
  });

  return { manifest, mapped };
}

export async function onboardEsphomeDevice(
  input: OnboardEsphomeInput
): Promise<OnboardEsphomeResult> {
  const yamlName = input.yamlName.trim();
  const suggestion = await suggestFromEsphome(yamlName);
  if (!suggestion) {
    throw new Error(`ESPHome YAML not found: ${yamlName}`);
  }

  const manifest = buildEsphomeDriverManifest(suggestion);
  let deviceId = input.deviceId?.trim() || "";
  let created = false;

  if (deviceId) {
    await syncDeviceFromEsphomeSuggestion(deviceId, suggestion);
    if (input.roomId !== undefined) {
      await getPool().query(
        `UPDATE devices SET room_id = $2, updated_at = NOW() WHERE id = $1`,
        [deviceId, input.roomId || null]
      );
    }
    if (input.name?.trim()) {
      await getPool().query(
        `UPDATE devices SET name = $2, updated_at = NOW() WHERE id = $1`,
        [deviceId, input.name.trim()]
      );
    }
  } else {
    const device = await createDevice({
      name: input.name?.trim() || suggestion.esphomeName,
      roomId: input.roomId ?? null,
      mqttTopicPrefix: suggestion.mqttTopicPrefix,
      esphomeName: suggestion.esphomeName,
      sensors: suggestion.sensors,
      relays: suggestion.relays,
    });
    deviceId = device.id;
    created = true;
  }

  const { sync, classified } = await syncAndClassifyCapabilities(
    deviceId,
    input.systemOverrides
  );

  await refreshTelemetrySubscriptions();

  const device = await getDeviceDetailed(deviceId);
  const mapped = mapCandidatesToCapabilities(manifest.candidates, {
    deviceName: device?.name ?? suggestion.esphomeName,
    areaName: device?.roomName,
    systemOverrides: input.systemOverrides,
  });

  return {
    deviceId,
    manifest,
    mapped,
    sync,
    classified,
    created,
  };
}
