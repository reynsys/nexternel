import type { FastifyPluginAsync } from "fastify";
import { requirePermission } from "../auth/rbac.js";
import { listBuiltinPlugins } from "../plugins/builtins.js";

export const pluginsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/plugins", async (request, reply) => {
    if (!requirePermission(request, reply, "viewSystem")) return;

    const plugins = listBuiltinPlugins().map((p) => ({
      id: p.id,
      version: p.version,
      pluginApi: p.pluginApi,
      name: p.name ?? p.id,
      description: p.description ?? "",
      contributes: p.contributes,
    }));

    return { plugins };
  });
};
