import os from "os";
import type { FastifyPluginAsync } from "fastify";
import { requireUser } from "../auth/plugin.js";
import { checkDatabase } from "../db.js";
import { getMqttStatus } from "../telemetry/mqtt.js";
import { config } from "../config.js";
import { APP_VERSION } from "../version.js";

const WAN_CACHE_TTL_MS = 5 * 60_000;
let wanCache: { ip: string | null; at: number } | null = null;

async function resolveWanIp(): Promise<string | null> {
  const now = Date.now();
  if (wanCache && now - wanCache.at < WAN_CACHE_TTL_MS) {
    return wanCache.ip;
  }
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      wanCache = { ip: wanCache?.ip ?? null, at: now };
      return wanCache.ip;
    }
    const data = (await res.json()) as { ip?: string };
    const ip = data.ip?.trim() || null;
    wanCache = { ip, at: now };
    return ip;
  } catch {
    wanCache = { ip: wanCache?.ip ?? null, at: now };
    return wanCache.ip;
  }
}

function lanIp(): string | null {
  const fromEnv = config.serverIp()?.trim();
  if (fromEnv) return fromEnv;
  const nets = os.networkInterfaces();
  for (const entries of Object.values(nets)) {
    if (!entries) continue;
    for (const e of entries) {
      if (e.family === "IPv4" && !e.internal) return e.address;
    }
  }
  return null;
}

export const systemRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/system", async (request, reply) => {
    if (!requireUser(request, reply)) return;

    const cpus = os.cpus();
    const cpuCount = cpus.length || 1;
    const load = os.loadavg();
    const loadPercent = Math.min(100, Math.round((load[0] / cpuCount) * 100));
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    const [database, wanIp] = await Promise.all([
      checkDatabase(),
      resolveWanIp(),
    ]);
    const mqtt = getMqttStatus();
    const lan = lanIp();
    const nodeRedUrl = lan ? `http://${lan}:1880` : "http://localhost:1880";

    return {
      version: APP_VERSION,
      service: "api",
      uptimeSeconds: Math.floor(process.uptime()),
      cpu: {
        model: cpus[0]?.model?.trim() || "CPU",
        cores: cpuCount,
        loadPercent,
      },
      memory: {
        totalMb: Math.round(totalMem / 1024 / 1024),
        usedMb: Math.round((totalMem - freeMem) / 1024 / 1024),
        freeMb: Math.round(freeMem / 1024 / 1024),
      },
      lanIp: lan,
      wanIp,
      database,
      mqtt: mqtt.status,
      mqttError: mqtt.lastError ?? null,
      nodeRedUrl,
      nodeRedPort: 1880,
    };
  });
};
