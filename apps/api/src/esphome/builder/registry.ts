import type { SystemId } from "@nexternel/domain";
import {
  ESPHOME_BOARD_CATALOG,
  ESPHOME_COMPONENT_CATALOG,
  type EsphomeDeviceBuilderConfig,
  type EsphomeLifecycleState,
  type EsphomeManagementMode,
} from "@nexternel/domain";
import { getPool } from "../../db.js";
import { createDevice } from "../../devices/service.js";
import { parseEsphomeYaml } from "../yaml.js";
import { buildEsphomeDriverManifest } from "../../v4/drivers/esphome.js";
import {
  mapCandidatesToCapabilities,
  syncAndClassifyCapabilities,
} from "../../v4/capability-mapper.js";
import { refreshTelemetrySubscriptions } from "../../telemetry/mqtt.js";
import { installationMqttRoot } from "../../migrate/align-mqtt-topics.js";
import { generateEsphomeYaml } from "./generate.js";
import { writeManagedEsphomeYaml } from "./storage.js";
import {
  normalizeBuilderConfig,
  validateEsphomeBuilderConfig,
  resolveBuilderSlug,
} from "./validate.js";

export function builderCatalogPayload() {
  return {
    boards: ESPHOME_BOARD_CATALOG,
    components: ESPHOME_COMPONENT_CATALOG,
    managementModes: ["managed", "imported", "advanced"] as EsphomeManagementMode[],
    lifecycleStates: [
      "draft",
      "configured",
      "validation_failed",
      "ready_to_build",
      "building",
      "firmware_ready",
      "awaiting_installation",
      "connecting",
      "online",
      "offline",
      "error",
    ] as EsphomeLifecycleState[],
  };
}

export async function previewManagedEsphomeDevice(
  raw: unknown,
  roomId?: string | null
) {
  const validation = validateEsphomeBuilderConfig(raw);
  if (!validation.valid) {
    return { validation, config: null, yaml: null, manifest: null, mapped: null };
  }

  const config = normalizeBuilderConfig(raw as EsphomeDeviceBuilderConfig);
  const yaml = generateEsphomeYaml(config);
  const slug = resolveBuilderSlug(config);
  const parsed = parseEsphomeYaml(yaml, slug, `devices/${slug}`);

  const manifest = buildEsphomeDriverManifest(parsed);
  let areaName: string | null = null;
  if (roomId) {
    const room = await getPool().query<{ name: string }>(
      `SELECT name FROM rooms WHERE id = $1`,
      [roomId]
    );
    areaName = room.rows[0]?.name ?? null;
  }

  const mapped = mapCandidatesToCapabilities(manifest.candidates, {
    deviceName: config.displayName,
    areaName,
  });

  return { validation, config, yaml, manifest, mapped, parsed };
}

export type CreateManagedEsphomeResult = {
  deviceId: string;
  yamlPath: string;
  lifecycleState: EsphomeLifecycleState;
  managementMode: EsphomeManagementMode;
  manifest: ReturnType<typeof buildEsphomeDriverManifest>;
  mapped: ReturnType<typeof mapCandidatesToCapabilities>;
  sync: { sensors: number; relays: number };
  classified: number;
};

export async function createManagedEsphomeDevice(input: {
  config: unknown;
  roomId?: string | null;
  systemOverrides?: Record<string, SystemId>;
}): Promise<CreateManagedEsphomeResult> {
  const preview = await previewManagedEsphomeDevice(input.config, input.roomId);
  if (!preview.validation.valid || !preview.config || !preview.parsed || !preview.manifest) {
    const first = preview.validation.issues[0];
    throw new Error(first?.message ?? "Invalid device configuration");
  }

  const config = preview.config;
  const slug = resolveBuilderSlug(config);
  const mqttRoot = installationMqttRoot();

  const existing = await getPool().query<{ id: string }>(
    `SELECT id FROM devices WHERE slug = $1 OR esphome_name = $2 LIMIT 1`,
    [slug, slug]
  );
  if (existing.rows[0]) {
    throw new Error(`A device named "${slug}" already exists`);
  }

  const { relativePath } = await writeManagedEsphomeYaml(config, preview.yaml!);

  const device = await createDevice({
    name: config.displayName,
    roomId: input.roomId ?? config.roomId ?? null,
    mqttTopicPrefix: `${mqttRoot}/${slug}`,
    esphomeName: slug,
    sensors: preview.parsed.sensors,
    relays: preview.parsed.relays,
  });

  await getPool().query(
    `UPDATE devices SET
       esphome_management_mode = 'managed',
       esphome_lifecycle_state = 'awaiting_installation',
       esphome_builder_config = $2::jsonb,
       esphome_yaml_path = $3,
       updated_at = NOW()
     WHERE id = $1`,
    [device.id, JSON.stringify(config), relativePath]
  );

  const { sync, classified } = await syncAndClassifyCapabilities(
    device.id,
    input.systemOverrides
  );
  await refreshTelemetrySubscriptions();

  const mapped = mapCandidatesToCapabilities(preview.manifest.candidates, {
    deviceName: config.displayName,
    areaName: device.roomName,
    systemOverrides: input.systemOverrides,
  });

  return {
    deviceId: device.id,
    yamlPath: relativePath,
    lifecycleState: "awaiting_installation",
    managementMode: "managed",
    manifest: preview.manifest,
    mapped,
    sync,
    classified,
  };
}
