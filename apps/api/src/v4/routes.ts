import type { FastifyPluginAsync } from "fastify";
import {
  listUserSelectablePanels,
  listPreviewPanels,
  isSystemId,
  type SystemId,
} from "@nexternel/domain";
import { requirePermission } from "../auth/rbac.js";
import { requireUser } from "../auth/plugin.js";
import { getCapabilityById, updateCapabilitySystemId } from "../capabilities/store.js";
import { getPool } from "../db.js";
import { classifyAllCapabilities } from "../capabilities/classify.js";
import {
  onboardEsphomeDevice,
  previewEsphomeOnboarding,
} from "./device-registry.js";
import {
  builderCatalogPayload,
  createManagedEsphomeDevice,
  previewManagedEsphomeDevice,
} from "../esphome/builder/registry.js";
import { validateEsphomeBuilderConfig } from "../esphome/builder/validate.js";
import {
  compileEsphomeDevice,
  readDeviceEsphomeYaml,
} from "../esphome/builder/compile.js";
import { resolvePanelCapabilities } from "./panel-resolver.js";
import {
  catalogRowsForSystemIds,
  listAllCatalogSystems,
  listSystemIdsInScope,
  parseAreaIdsQuery,
} from "./systems-in-scope.js";

function panelRegistryPayload(opts?: { preview?: boolean }) {
  const panels = opts?.preview ? listPreviewPanels() : listUserSelectablePanels();
  return {
    panels: panels.map((p) => ({
      kind: p.kind,
      label: p.label,
      description: p.description,
      supportedKinds: p.supportedKinds,
      excludeKinds: p.excludeKinds ?? [],
      userSelectable: p.userSelectable,
      previewOnly: p.previewOnly ?? false,
      sortOrder: p.sortOrder,
      defaultSize: p.defaultSize,
      scopeMode: p.scopeMode,
    })),
  };
}

async function handleResolvePanel(
  body: {
    panelKind?: string;
    panelScope?: unknown;
    viewKind?: string;
    viewScope?: unknown;
  } | undefined
) {
  const panelKind =
    typeof body?.panelKind === "string"
      ? body.panelKind.trim()
      : typeof body?.viewKind === "string"
        ? body.viewKind.trim()
        : "";
  if (!panelKind) {
    return {
      status: 400 as const,
      body: {
        error: { code: "validation_error", message: "panelKind is required" },
      },
    };
  }
  try {
    const result = await resolvePanelCapabilities({
      panelKind,
      panelScope: body?.panelScope,
      viewKind: body?.viewKind,
      viewScope: body?.viewScope,
    });
    return { status: 200 as const, body: result };
  } catch (err) {
    return {
      status: 400 as const,
      body: {
        error: {
          code: "resolve_failed",
          message: err instanceof Error ? err.message : "Panel resolve failed",
        },
      },
    };
  }
}

export const v4Routes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/v4/panels/registry", async (request, reply) => {
    if (!requireUser(request, reply)) return;
    const q = request.query as { preview?: string };
    const preview = q.preview === "1" || q.preview === "true";
    return panelRegistryPayload({ preview });
  });

  app.post<{
    Body: {
      panelKind?: string;
      panelScope?: unknown;
      viewKind?: string;
      viewScope?: unknown;
    };
  }>("/api/v1/v4/panels/resolve", async (request, reply) => {
    if (!requireUser(request, reply)) return;
    const result = await handleResolvePanel(request.body);
    return reply.code(result.status).send(result.body);
  });

  /** @deprecated use /v4/panels/registry */
  app.get("/api/v1/v4/views/registry", async (request, reply) => {
    if (!requireUser(request, reply)) return;
    const { panels } = panelRegistryPayload();
    return { views: panels };
  });

  /** @deprecated use /v4/panels/resolve */
  app.post<{
    Body: { viewKind?: string; viewScope?: unknown };
  }>("/api/v1/v4/views/resolve", async (request, reply) => {
    if (!requireUser(request, reply)) return;
    const result = await handleResolvePanel(request.body);
    if (result.status === 200) {
      const resolved = result.body as Awaited<
        ReturnType<typeof resolvePanelCapabilities>
      >;
      return {
        viewKind: resolved.panelKind,
        viewScope: resolved.panelScope,
        capabilities: resolved.capabilities,
      };
    }
    return reply.code(result.status).send(result.body);
  });

  app.get("/api/v1/v4/systems", async (request, reply) => {
    if (!requireUser(request, reply)) return;
    const q = request.query as Record<string, unknown>;
    const catalog = q.catalog === "1" || q.catalog === "true";
    if (catalog) {
      return { systems: listAllCatalogSystems() };
    }
    const areaIds = parseAreaIdsQuery(q);
    const inScope = await listSystemIdsInScope(areaIds);
    return { systems: catalogRowsForSystemIds(inScope) };
  });

  app.get("/api/v1/v4/devices/esphome/preview", async (request, reply) => {
    if (!requirePermission(request, reply, "viewDevices")) return;
    const q = request.query as { yamlName?: string; roomId?: string };
    const yamlName = typeof q.yamlName === "string" ? q.yamlName.trim() : "";
    if (!yamlName) {
      return reply.code(400).send({
        error: { code: "validation_error", message: "yamlName query is required" },
      });
    }
    const roomId =
      typeof q.roomId === "string" && q.roomId.trim() ? q.roomId.trim() : null;
    const preview = await previewEsphomeOnboarding(yamlName, roomId);
    if (!preview) {
      return reply.code(404).send({
        error: { code: "not_found", message: "ESPHome YAML not found" },
      });
    }
    return preview;
  });

  app.post<{
    Body: {
      yamlName?: string;
      name?: string;
      roomId?: string | null;
      deviceId?: string;
      systemOverrides?: Record<string, string>;
    };
  }>("/api/v1/v4/devices/onboard/esphome", async (request, reply) => {
    if (!requirePermission(request, reply, "editDevices")) return;

    const yamlName =
      typeof request.body?.yamlName === "string"
        ? request.body.yamlName.trim()
        : "";
    if (!yamlName) {
      return reply.code(400).send({
        error: { code: "validation_error", message: "yamlName is required" },
      });
    }

    const systemOverrides: Record<string, string> = {};
    const rawOverrides = request.body?.systemOverrides;
    if (rawOverrides && typeof rawOverrides === "object") {
      for (const [key, value] of Object.entries(rawOverrides)) {
        if (typeof value === "string" && isSystemId(value)) {
          systemOverrides[key] = value;
        }
      }
    }

    try {
      const result = await onboardEsphomeDevice({
        yamlName,
        name: request.body?.name,
        roomId: request.body?.roomId,
        deviceId: request.body?.deviceId,
        systemOverrides: systemOverrides as Record<string, SystemId>,
      });
      return { ok: true, ...result };
    } catch (err) {
      return reply.code(400).send({
        error: {
          code: "onboard_failed",
          message: err instanceof Error ? err.message : "Onboard failed",
        },
      });
    }
  });

  app.get("/api/v1/v4/devices/esphome/builder/catalog", async (request, reply) => {
    if (!requirePermission(request, reply, "viewDevices")) return;
    return builderCatalogPayload();
  });

  app.post<{ Body: { config?: unknown } }>(
    "/api/v1/v4/devices/esphome/builder/validate",
    async (request, reply) => {
      if (!requirePermission(request, reply, "viewDevices")) return;
      const validation = validateEsphomeBuilderConfig(request.body?.config);
      return { ok: validation.valid, ...validation };
    }
  );

  app.post<{ Body: { config?: unknown; roomId?: string | null } }>(
    "/api/v1/v4/devices/esphome/builder/preview",
    async (request, reply) => {
      if (!requirePermission(request, reply, "viewDevices")) return;
      const roomId =
        typeof request.body?.roomId === "string" && request.body.roomId.trim()
          ? request.body.roomId.trim()
          : null;
      const preview = await previewManagedEsphomeDevice(
        request.body?.config,
        roomId
      );
      return { ok: preview.validation.valid, ...preview };
    }
  );

  app.post<{
    Body: {
      config?: unknown;
      roomId?: string | null;
      systemOverrides?: Record<string, string>;
    };
  }>("/api/v1/v4/devices/esphome/builder/create", async (request, reply) => {
    if (!requirePermission(request, reply, "editDevices")) return;

    const systemOverrides: Record<string, string> = {};
    const rawOverrides = request.body?.systemOverrides;
    if (rawOverrides && typeof rawOverrides === "object") {
      for (const [key, value] of Object.entries(rawOverrides)) {
        if (typeof value === "string" && isSystemId(value)) {
          systemOverrides[key] = value;
        }
      }
    }

    try {
      const result = await createManagedEsphomeDevice({
        config: request.body?.config,
        roomId: request.body?.roomId,
        systemOverrides: systemOverrides as Record<string, SystemId>,
      });
      return { ok: true, ...result };
    } catch (err) {
      return reply.code(400).send({
        error: {
          code: "builder_create_failed",
          message: err instanceof Error ? err.message : "Create failed",
        },
      });
    }
  });

  app.get<{ Params: { deviceId: string } }>(
    "/api/v1/v4/devices/esphome/:deviceId/yaml",
    async (request, reply) => {
      if (!requirePermission(request, reply, "viewDevices")) return;
      const deviceId = request.params.deviceId?.trim();
      if (!deviceId) {
        return reply.code(400).send({
          error: { code: "validation_error", message: "deviceId is required" },
        });
      }
      const result = await readDeviceEsphomeYaml(deviceId);
      if (!result) {
        return reply.code(404).send({
          error: { code: "not_found", message: "ESPHome YAML not found for this device" },
        });
      }
      return result;
    }
  );

  app.post<{ Params: { deviceId: string } }>(
    "/api/v1/v4/devices/esphome/:deviceId/compile",
    async (request, reply) => {
      if (!requirePermission(request, reply, "editDevices")) return;
      const deviceId = request.params.deviceId?.trim();
      if (!deviceId) {
        return reply.code(400).send({
          error: { code: "validation_error", message: "deviceId is required" },
        });
      }
      try {
        const result = await compileEsphomeDevice(deviceId);
        return result;
      } catch (err) {
        return reply.code(400).send({
          error: {
            code: "compile_failed",
            message: err instanceof Error ? err.message : "Compile failed",
          },
        });
      }
    }
  );

  app.post("/api/v1/v4/capabilities/classify", async (request, reply) => {
    if (!requirePermission(request, reply, "editDevices")) return;
    const classified = await classifyAllCapabilities();
    return { ok: true, classified };
  });

  app.get("/api/v1/v4/capabilities", async (request, reply) => {
    if (!requireUser(request, reply)) return;
    const result = await getPool().query<{
      id: string;
      device_id: string;
      device_name: string;
      kind: string;
      name: string;
      unit: string | null;
      system_id: string | null;
      area_id: string | null;
      group_id: string | null;
      service_id: string | null;
      area_name: string | null;
      state_topic: string | null;
    }>(
      `SELECT c.id, c.device_id, d.name AS device_name,
              c.kind, c.name, c.unit,
              c.system_id, c.area_id, c.group_id, c.service_id,
              r.name AS area_name,
              b.state_topic
       FROM capabilities c
       JOIN devices d ON d.id = c.device_id
       LEFT JOIN rooms r ON r.id = c.area_id
       LEFT JOIN capability_bindings b ON b.capability_id = c.id
       WHERE c.is_enabled = TRUE
         AND COALESCE(d.is_enabled, TRUE) = TRUE
       ORDER BY COALESCE(r.name, ''), d.name ASC, c.name ASC`
    );

    const { getAllLiveStates, getLiveState } = await import(
      "../telemetry/state-cache.js"
    );
    const live = new Map(getAllLiveStates().map((s) => [s.capabilityId, s]));

    return {
      capabilities: result.rows.map((c) => {
        const state = live.get(c.id) ?? getLiveState(c.id);
        return {
          id: c.id,
          deviceId: c.device_id,
          deviceName: c.device_name,
          kind: c.kind,
          name: c.name,
          unit: c.unit,
          systemId: c.system_id,
          areaId: c.area_id,
          groupId: c.group_id,
          serviceId: c.service_id,
          areaName: c.area_name,
          stateTopic: c.state_topic,
          state: state
            ? {
                value: state.value,
                quality: state.quality,
                updatedAt: state.updatedAt,
              }
            : null,
        };
      }),
    };
  });

  app.patch<{
    Params: { id: string };
    Body: { systemId?: string | null };
  }>("/api/v1/v4/capabilities/:id", async (request, reply) => {
    if (!requirePermission(request, reply, "editDevices")) return;
    const capabilityId = request.params.id?.trim();
    if (!capabilityId) {
      return reply.code(400).send({
        error: { code: "validation_error", message: "Capability id is required" },
      });
    }
    const cap = await getCapabilityById(capabilityId);
    if (!cap) {
      return reply.code(404).send({
        error: { code: "not_found", message: "Capability not found" },
      });
    }
    const raw = request.body?.systemId;
    let systemId: string | null = null;
    if (raw !== undefined && raw !== null && raw !== "") {
      if (typeof raw !== "string" || !isSystemId(raw)) {
        return reply.code(400).send({
          error: { code: "validation_error", message: "Invalid systemId" },
        });
      }
      systemId = raw;
    }
    const updated = await updateCapabilitySystemId(capabilityId, systemId);
    if (!updated) {
      return reply.code(404).send({
        error: { code: "not_found", message: "Capability not found" },
      });
    }
    return { ok: true, systemId };
  });
};
