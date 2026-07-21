import type { FastifyPluginAsync } from "fastify";
import { CAPABILITY_KINDS } from "@nexternel/domain";
import { checkDatabase, getPool } from "../db.js";
import { getMqttStatus } from "../telemetry/mqtt.js";
import { APP_VERSION } from "../version.js";

async function safeCount(sql: string): Promise<number | null> {
  try {
    const result = await getPool().query<{ c: string }>(sql);
    return Number(result.rows[0]?.c ?? 0);
  } catch {
    return null;
  }
}

export const diagnosticsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/diagnostics", async () => {
    const database = await checkDatabase();
    const mqtt = getMqttStatus();
    const mqttOk = mqtt.status === "connected";

    const [capabilities, capabilityBindings, v3Dashboards] = await Promise.all([
      safeCount("SELECT COUNT(*)::text AS c FROM capabilities"),
      safeCount("SELECT COUNT(*)::text AS c FROM capability_bindings"),
      safeCount("SELECT COUNT(*)::text AS c FROM v3_dashboards"),
    ]);

    return {
      status: database === "ok" && mqttOk ? "ok" : "degraded",
      version: APP_VERSION,
      service: "api",
      database,
      mqtt: mqtt.status,
      mqttError: mqtt.lastError ?? null,
      capabilityKindsRegistered: CAPABILITY_KINDS.length,
      counts: {
        capabilities,
        capabilityBindings,
        v3Dashboards,
      },
      process: {
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
      },
    };
  });
};
