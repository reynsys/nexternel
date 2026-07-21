import type { FastifyPluginAsync } from "fastify";
import { getPool, type DbDevice } from "../db.js";
import { requireUser } from "../auth/plugin.js";

export const devicesRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/devices", async (request, reply) => {
    if (!requireUser(request, reply)) return;

    const result = await getPool().query<DbDevice>(
      `SELECT id, room_id, name, slug,
              COALESCE(is_enabled, TRUE) AS is_enabled,
              is_online, last_seen_at
       FROM devices
       ORDER BY name ASC`
    );

    return {
      devices: result.rows.map((d) => ({
        id: d.id,
        roomId: d.room_id,
        name: d.name,
        slug: d.slug,
        isEnabled: d.is_enabled,
        isOnline: d.is_online,
        lastSeenAt: d.last_seen_at ? d.last_seen_at.toISOString() : null,
      })),
    };
  });
};
