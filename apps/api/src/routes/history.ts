import type { FastifyPluginAsync } from "fastify";
import { requireUser } from "../auth/plugin.js";
import { isHistoryRange, querySensorHistory, type HistoryRange } from "../history/influx.js";
import { resolveHistoryTarget } from "../history/resolve.js";

export const historyRoutes: FastifyPluginAsync = async (app) => {
  app.get<{
    Querystring: { capabilityId?: string; range?: string };
  }>(
    "/api/v1/history",
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      if (!requireUser(request, reply)) return;

      const capabilityId = request.query.capabilityId?.trim();
      if (!capabilityId) {
        return reply.code(400).send({
          error: {
            code: "bad_request",
            message: "capabilityId is required",
          },
        });
      }

      const rangeRaw = (request.query.range ?? "24h").trim();
      if (!isHistoryRange(rangeRaw)) {
        return reply.code(400).send({
          error: {
            code: "bad_request",
            message: "range must be one of: 1h, 6h, 24h, 7d",
          },
        });
      }
      const range: HistoryRange = rangeRaw;

      const resolved = await resolveHistoryTarget(capabilityId);
      if (!resolved.ok) {
        return reply.code(resolved.status).send({
          error: {
            code: resolved.status === 404 ? "not_found" : "bad_request",
            message: resolved.message,
          },
        });
      }

      try {
        const { points, aggregateEvery } = await querySensorHistory(
          resolved.target.deviceSlug,
          resolved.target.entityId,
          range
        );
        return {
          capabilityId: resolved.target.capabilityId,
          name: resolved.target.name,
          unit: resolved.target.unit,
          range,
          aggregateEvery,
          points,
        };
      } catch (err) {
        request.log.error({ err }, "history query failed");
        return reply.code(502).send({
          error: {
            code: "influx_error",
            message:
              err instanceof Error ? err.message : "InfluxDB query failed",
          },
        });
      }
    }
  );
};
