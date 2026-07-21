import type { FastifyPluginAsync } from "fastify";
import { getPool, type DbRoom } from "../db.js";
import { requireUser } from "../auth/plugin.js";

export const roomsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/rooms", async (request, reply) => {
    if (!requireUser(request, reply)) return;

    const result = await getPool().query<DbRoom>(
      `SELECT id, name, description, sort_order
       FROM rooms
       ORDER BY sort_order ASC, name ASC`
    );

    return {
      rooms: result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        sortOrder: r.sort_order,
      })),
    };
  });
};
