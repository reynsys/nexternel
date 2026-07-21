import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthRole } from "./tokens.js";

export function requireAdmin(request: FastifyRequest, reply: FastifyReply): boolean {
  if (!request.user) {
    reply.code(401).send({
      error: { code: "unauthorized", message: "Authentication required" },
    });
    return false;
  }
  if (request.user.role !== "admin") {
    reply.code(403).send({
      error: { code: "forbidden", message: "Admin role required" },
    });
    return false;
  }
  return true;
}

export function parseRole(value: unknown): AuthRole | null {
  if (value === "admin" || value === "viewer") return value;
  return null;
}
