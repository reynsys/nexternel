import type { FastifyPluginAsync } from "fastify";
import { requirePermission } from "../auth/rbac.js";
import { syncCapabilitiesFromLegacy } from "../capabilities/sync.js";
import { refreshTelemetrySubscriptions } from "../telemetry/mqtt.js";
import { getPool } from "../db.js";
import {
  listEsphomeYamlFiles,
  suggestFromEsphome,
  type EsphomeImportSuggestion,
} from "../esphome/yaml.js";
import {
  createDevice,
  deleteDevice,
  getDeviceDetailed,
  listDevicesDetailed,
  renameRelay,
  renameSensor,
  syncDeviceFromEsphomeSuggestion,
  updateDevice,
} from "../devices/service.js";

function pgErrorCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code: unknown }).code);
  }
  return "";
}

async function afterDeviceMutation() {
  await syncCapabilitiesFromLegacy();
  await refreshTelemetrySubscriptions();
}

export const devicesRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/devices", async (request, reply) => {
    if (!requirePermission(request, reply, "viewDevices")) return;
    const devices = await listDevicesDetailed();
    return { devices };
  });

  app.get("/api/v1/devices/esphome-catalog", async (request, reply) => {
    if (!requirePermission(request, reply, "viewDevices")) return;

    const files = await listEsphomeYamlFiles();
    const registered = await getPool().query<{
      esphome_name: string | null;
      slug: string;
      mqtt_topic_prefix: string;
    }>(`SELECT esphome_name, slug, mqtt_topic_prefix FROM devices`);

    const configs = await Promise.all(
      files.map(async (fileName) => {
        const suggestion = await suggestFromEsphome(fileName);
        const esphomeName = suggestion?.esphomeName || fileName;
        const mqttTopicPrefix =
          suggestion?.mqttTopicPrefix || `damnhome/${fileName}`;
        const isRegistered = registered.rows.some(
          (d) =>
            d.esphome_name === esphomeName ||
            d.esphome_name === fileName ||
            d.slug === fileName ||
            d.mqtt_topic_prefix === mqttTopicPrefix
        );
        return {
          fileName,
          esphomeName,
          mqttTopicPrefix,
          registered: isRegistered,
          sensorCount: suggestion?.sensors.length ?? 0,
          relayCount: suggestion?.relays.length ?? 0,
          suggestion,
        };
      })
    );

    return {
      configs,
      esphomeDirHint:
        files.length === 0
          ? "No YAML files found in /esphome — create a device in ESPHome Builder first, then ensure the esphome/ folder is on the server."
          : null,
    };
  });

  app.get("/api/v1/devices/esphome-suggest", async (request, reply) => {
    if (!requirePermission(request, reply, "viewDevices")) return;
    const q = request.query as { name?: string };
    const name = typeof q.name === "string" ? q.name.trim() : "";
    if (!name) {
      return reply.code(400).send({
        error: { code: "validation_error", message: "name query is required" },
      });
    }
    const suggestion = await suggestFromEsphome(name);
    if (!suggestion) {
      return reply.code(404).send({
        error: { code: "not_found", message: "ESPHome YAML not found" },
      });
    }
    return suggestion;
  });

  app.post("/api/v1/devices", async (request, reply) => {
    if (!requirePermission(request, reply, "editDevices")) return;

    const body = (request.body ?? {}) as {
      name?: unknown;
      roomId?: unknown;
      mqttTopicPrefix?: unknown;
      esphomeName?: unknown;
      firmwareType?: unknown;
      shellyChannel?: unknown;
      shellySwitchCount?: unknown;
      shellyModelId?: unknown;
      ipAddress?: unknown;
      macAddress?: unknown;
      sensors?: EsphomeImportSuggestion["sensors"];
      relays?: EsphomeImportSuggestion["relays"];
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const mqttTopicPrefix =
      typeof body.mqttTopicPrefix === "string" ? body.mqttTopicPrefix.trim() : "";
    if (!name || !mqttTopicPrefix) {
      return reply.code(400).send({
        error: {
          code: "validation_error",
          message: "Name and MQTT topic prefix are required",
        },
      });
    }

    const firmwareType =
      typeof body.firmwareType === "string"
        ? body.firmwareType.trim().toLowerCase()
        : "esphome";
    if (firmwareType !== "esphome" && firmwareType !== "shelly") {
      return reply.code(400).send({
        error: {
          code: "validation_error",
          message: "firmwareType must be esphome or shelly",
        },
      });
    }

    const shellyChannel =
      typeof body.shellyChannel === "number"
        ? body.shellyChannel
        : typeof body.shellyChannel === "string"
          ? Number(body.shellyChannel)
          : 0;

    const shellySwitchCount =
      typeof body.shellySwitchCount === "number"
        ? body.shellySwitchCount
        : typeof body.shellySwitchCount === "string"
          ? Number(body.shellySwitchCount)
          : undefined;

    const shellyModelId =
      typeof body.shellyModelId === "string" ? body.shellyModelId.trim() : null;

    try {
      const device = await createDevice({
        name,
        roomId: typeof body.roomId === "string" ? body.roomId : null,
        mqttTopicPrefix,
        esphomeName: typeof body.esphomeName === "string" ? body.esphomeName : null,
        firmwareType,
        shellyChannel: Number.isFinite(shellyChannel) ? shellyChannel : 0,
        shellySwitchCount: Number.isFinite(shellySwitchCount as number)
          ? (shellySwitchCount as number)
          : undefined,
        shellyModelId,
        ipAddress: typeof body.ipAddress === "string" ? body.ipAddress : null,
        macAddress: typeof body.macAddress === "string" ? body.macAddress : null,
        sensors: Array.isArray(body.sensors) ? body.sensors : [],
        relays: Array.isArray(body.relays) ? body.relays : [],
      });
      await afterDeviceMutation();
      return reply.code(201).send({ device });
    } catch (err) {
      if (pgErrorCode(err) === "23505") {
        return reply.code(409).send({
          error: {
            code: "conflict",
            message: "A device with that slug or MQTT prefix already exists",
          },
        });
      }
      const message = err instanceof Error ? err.message : "Failed to create device";
      return reply.code(400).send({
        error: { code: "validation_error", message },
      });
    }
  });

  app.patch("/api/v1/devices/:id", async (request, reply) => {
    if (!requirePermission(request, reply, "editDevices")) return;
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as Record<string, unknown>;

    try {
      const device = await updateDevice(id, {
        name: typeof body.name === "string" ? body.name : undefined,
        roomId:
          body.roomId === null
            ? null
            : typeof body.roomId === "string"
              ? body.roomId
              : undefined,
        mqttTopicPrefix:
          typeof body.mqttTopicPrefix === "string" ? body.mqttTopicPrefix : undefined,
        esphomeName:
          body.esphomeName === null
            ? null
            : typeof body.esphomeName === "string"
              ? body.esphomeName
              : undefined,
        ipAddress:
          body.ipAddress === null
            ? null
            : typeof body.ipAddress === "string"
              ? body.ipAddress
              : undefined,
        macAddress:
          body.macAddress === null
            ? null
            : typeof body.macAddress === "string"
              ? body.macAddress
              : undefined,
        isEnabled: typeof body.isEnabled === "boolean" ? body.isEnabled : undefined,
      });
      if (!device) {
        return reply.code(404).send({
          error: { code: "not_found", message: "Device not found" },
        });
      }
      await afterDeviceMutation();
      return { device };
    } catch (err) {
      if (pgErrorCode(err) === "23505") {
        return reply.code(409).send({
          error: { code: "conflict", message: "Device name/slug conflict" },
        });
      }
      const message = err instanceof Error ? err.message : "Failed to update device";
      return reply.code(400).send({
        error: { code: "validation_error", message },
      });
    }
  });

  app.delete("/api/v1/devices/:id", async (request, reply) => {
    if (!requirePermission(request, reply, "editDevices")) return;
    const { id } = request.params as { id: string };
    const ok = await deleteDevice(id);
    if (!ok) {
      return reply.code(404).send({
        error: { code: "not_found", message: "Device not found" },
      });
    }
    await afterDeviceMutation();
    return { ok: true };
  });

  app.post("/api/v1/devices/:id/sync-esphome", async (request, reply) => {
    if (!requirePermission(request, reply, "editDevices")) return;
    const { id } = request.params as { id: string };
    const device = await getDeviceDetailed(id);
    if (!device) {
      return reply.code(404).send({
        error: { code: "not_found", message: "Device not found" },
      });
    }

    const suggestion = await suggestFromEsphome(
      device.esphomeName || device.slug
    );
    if (!suggestion) {
      return reply.code(404).send({
        error: {
          code: "not_found",
          message: "ESPHome YAML not found for this device",
        },
      });
    }

    const stats = await syncDeviceFromEsphomeSuggestion(id, suggestion);
    await afterDeviceMutation();
    const updated = await getDeviceDetailed(id);
    return {
      ...stats,
      yamlFile: suggestion.yamlFile,
      mqttTopicPrefix: suggestion.mqttTopicPrefix,
      relaysInYaml: suggestion.relays.map((r) => r.name),
      isOnline: updated?.isOnline ?? false,
      device: updated,
    };
  });

  app.patch("/api/v1/devices/:deviceId/relays/:relayId", async (request, reply) => {
    if (!requirePermission(request, reply, "editDevices")) return;
    const { deviceId, relayId } = request.params as {
      deviceId: string;
      relayId: string;
    };
    const body = (request.body ?? {}) as { name?: unknown };
    if (typeof body.name !== "string") {
      return reply.code(400).send({
        error: { code: "validation_error", message: "name is required" },
      });
    }
    const owned = await getPool().query(
      `SELECT id FROM relays WHERE id = $1 AND device_id = $2`,
      [relayId, deviceId]
    );
    if (owned.rowCount === 0) {
      return reply.code(404).send({
        error: { code: "not_found", message: "Relay not found" },
      });
    }
    try {
      await renameRelay(relayId, body.name);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Rename failed";
      return reply.code(400).send({
        error: { code: "validation_error", message },
      });
    }
  });

  app.patch("/api/v1/devices/:deviceId/sensors/:sensorId", async (request, reply) => {
    if (!requirePermission(request, reply, "editDevices")) return;
    const { deviceId, sensorId } = request.params as {
      deviceId: string;
      sensorId: string;
    };
    const body = (request.body ?? {}) as { name?: unknown };
    if (typeof body.name !== "string") {
      return reply.code(400).send({
        error: { code: "validation_error", message: "name is required" },
      });
    }
    const owned = await getPool().query(
      `SELECT id FROM sensors WHERE id = $1 AND device_id = $2`,
      [sensorId, deviceId]
    );
    if (owned.rowCount === 0) {
      return reply.code(404).send({
        error: { code: "not_found", message: "Sensor not found" },
      });
    }
    try {
      await renameSensor(sensorId, body.name);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Rename failed";
      return reply.code(400).send({
        error: { code: "validation_error", message },
      });
    }
  });
};
