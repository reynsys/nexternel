import type { FastifyPluginAsync } from "fastify";
import { requireUser } from "../auth/plugin.js";
import { requireAdmin } from "../auth/rbac.js";
import { listCapabilities, getCapabilityById } from "../capabilities/store.js";
import { syncCapabilitiesFromLegacy } from "../capabilities/sync.js";
import { getLiveState, getAllLiveStates } from "../telemetry/state-cache.js";
import {
  publishSwitchCommand,
  refreshTelemetrySubscriptions,
} from "../telemetry/mqtt.js";

export const capabilitiesRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/capabilities", async (request, reply) => {
    if (!requireUser(request, reply)) return;
    const rows = await listCapabilities();
    const live = new Map(getAllLiveStates().map((s) => [s.capabilityId, s]));
    return {
      capabilities: rows.map((c) => {
        const state = live.get(c.id) ?? getLiveState(c.id);
        return {
          id: c.id,
          deviceId: c.device_id,
          deviceName: c.device_name,
          roomId: c.room_id,
          roomName: c.room_name,
          kind: c.kind,
          name: c.name,
          unit: c.unit,
          sourceType: c.source_type,
          hasCommand: Boolean(c.command_topic),
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

  app.post("/api/v1/capabilities/sync", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const result = await syncCapabilitiesFromLegacy();
    await refreshTelemetrySubscriptions();
    return { ok: true, ...result };
  });

  app.post<{
    Params: { id: string };
    Body: { action?: string };
  }>("/api/v1/capabilities/:id/command", async (request, reply) => {
    if (!requireUser(request, reply)) return;
    const action = (request.body?.action ?? "").toLowerCase();
    if (action !== "on" && action !== "off" && action !== "toggle") {
      return reply.code(400).send({
        error: {
          code: "bad_request",
          message: "action must be on, off, or toggle",
        },
      });
    }
    const cap = await getCapabilityById(request.params.id);
    if (!cap) {
      return reply.code(404).send({
        error: { code: "not_found", message: "Capability not found" },
      });
    }
    try {
      const result = await publishSwitchCommand(
        request.params.id,
        action as "on" | "off" | "toggle"
      );
      return { ok: true, value: result.value };
    } catch (err) {
      return reply.code(400).send({
        error: {
          code: "command_failed",
          message: err instanceof Error ? err.message : "Command failed",
        },
      });
    }
  });
};
