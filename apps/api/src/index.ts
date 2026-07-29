import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { attachUser } from "./auth/plugin.js";
import { ensureCapabilitySchema } from "./capabilities/ensure-schema.js";
import { ensureDashboardSchema } from "./dashboards/ensure-schema.js";
import { ensureCameraSchema } from "./cameras/ensure-schema.js";
import { ensureDevicesSchema } from "./devices/ensure-schema.js";
import { syncAllCamerasToGo2rtc } from "./cameras/service.js";
import { ensureUsersRoleSchema } from "./auth/ensure-users-role.js";
import { ensureUsersThemeSchema } from "./auth/ensure-users-theme.js";
import { ensureUsersAvatarSchema } from "./auth/ensure-users-avatar.js";
import { ensureRolesSchema } from "./auth/ensure-roles-schema.js";
import { ensureAdminFromEnv } from "./auth/ensure-admin.js";
import { syncCapabilitiesFromLegacy } from "./capabilities/sync.js";
import { startTelemetry } from "./telemetry/mqtt.js";
import { healthRoutes } from "./routes/health.js";
import { diagnosticsRoutes } from "./routes/diagnostics.js";
import { authRoutes } from "./routes/auth.js";
import { roomsRoutes } from "./routes/rooms.js";
import { devicesRoutes } from "./routes/devices.js";
import { camerasRoutes } from "./routes/cameras.js";
import { capabilitiesRoutes } from "./routes/capabilities.js";
import { dashboardsRoutes } from "./dashboards/routes.js";
import { historyRoutes } from "./routes/history.js";
import { usersRoutes } from "./routes/users.js";
import { rolesRoutes } from "./routes/roles.js";
import { systemRoutes } from "./routes/system.js";
import { migrateRoutes } from "./migrate/routes.js";
import { weatherRoutes } from "./routes/weather.js";
import { shellyRoutes } from "./routes/shelly.js";
import { wsRoutes } from "./telemetry/ws.js";
import { APP_VERSION } from "./version.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Nexternel-Token",
  ],
});

await app.register(cookie);

await app.register(rateLimit, {
  global: false,
});

/**
 * Register routes in one context with the auth hook.
 * (Sibling `register(authPlugin)` hooks do NOT apply to sibling route plugins
 * because of Fastify encapsulation — that caused empty verifyFailures.)
 */
await app.register(async (api) => {
  api.addHook("onRequest", async (request) => {
    await attachUser(request);
  });
  await api.register(healthRoutes);
  await api.register(diagnosticsRoutes);
  await api.register(authRoutes);
  await api.register(roomsRoutes);
  await api.register(devicesRoutes);
  await api.register(camerasRoutes);
  await api.register(capabilitiesRoutes);
  await api.register(dashboardsRoutes);
  await api.register(historyRoutes);
  await api.register(usersRoutes);
  await api.register(rolesRoutes);
  await api.register(systemRoutes);
  await api.register(migrateRoutes);
  await api.register(weatherRoutes);
  await api.register(shellyRoutes);
  await api.register(wsRoutes);
});

app.get("/", async (_request, reply) => {
  return reply.redirect("/api/v1/health");
});

try {
  await ensureUsersRoleSchema();
  await ensureUsersThemeSchema();
  await ensureUsersAvatarSchema();
  await ensureRolesSchema();
  await ensureDevicesSchema();
  await ensureCapabilitySchema();
  await ensureDashboardSchema();
  await ensureCameraSchema();
  const adminSeed = await ensureAdminFromEnv();
  app.log.info({ adminSeed }, "admin bootstrap from ADMIN_* env");
  const synced = await syncCapabilitiesFromLegacy();
  app.log.info(synced, "capabilities synced from sensors/relays");
  try {
    const { repairDashboardCapabilityBindings } = await import(
      "./migrate/repair-dashboard-bindings.js"
    );
    const repaired = await repairDashboardCapabilityBindings();
    if (repaired.bindingsRemapped > 0 || repaired.dashboardsUpdated > 0) {
      app.log.info(repaired, "dashboard capability bindings repaired");
    }
  } catch (err) {
    app.log.warn({ err }, "dashboard binding repair skipped");
  }
  try {
    const camSync = await syncAllCamerasToGo2rtc();
    app.log.info(camSync, "cameras synced to go2rtc");
  } catch (err) {
    app.log.warn({ err }, "go2rtc camera sync skipped (is go2rtc up?)");
  }
  await startTelemetry();
  app.log.info(getMqttLogSafe(), "telemetry started");

  await app.listen({ port: config.port, host: config.host });
  app.log.info(`Nexternel API ${APP_VERSION} listening on ${config.host}:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

function getMqttLogSafe() {
  return { broker: config.mqttBroker() };
}
