import type { FastifyPluginAsync } from "fastify";
import { getPool, type DbUser } from "../db.js";
import { requireAdmin, parseRole } from "../auth/rbac.js";
import { hashPassword, roleFromDb } from "../auth/tokens.js";

type UserRow = {
  id: string;
  username: string;
  display_name: string | null;
  is_active: boolean;
  role: string;
  created_at: Date;
};

function mapUser(u: UserRow) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    isActive: u.is_active,
    role: roleFromDb(u.role),
    createdAt: u.created_at.toISOString(),
  };
}

export const usersRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/users", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const result = await getPool().query<UserRow>(
      `SELECT id, username, display_name, is_active, role, created_at
       FROM users
       ORDER BY username ASC`
    );
    return { users: result.rows.map(mapUser) };
  });

  app.post<{
    Body: {
      username?: string;
      password?: string;
      displayName?: string;
      role?: string;
    };
  }>("/api/v1/users", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const username = request.body?.username?.trim();
    const password = request.body?.password;
    const displayName = request.body?.displayName?.trim() || null;
    const role = parseRole(request.body?.role ?? "viewer");
    if (!username || !password) {
      return reply.code(400).send({
        error: {
          code: "bad_request",
          message: "username and password are required",
        },
      });
    }
    if (!role) {
      return reply.code(400).send({
        error: { code: "bad_request", message: "role must be admin or viewer" },
      });
    }
    if (password.length < 6) {
      return reply.code(400).send({
        error: {
          code: "bad_request",
          message: "password must be at least 6 characters",
        },
      });
    }

    const hash = await hashPassword(password);
    try {
      const result = await getPool().query<UserRow>(
        `INSERT INTO users (username, password_hash, display_name, role, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         RETURNING id, username, display_name, is_active, role, created_at`,
        [username, hash, displayName, role]
      );
      return { user: mapUser(result.rows[0]) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("unique") || msg.includes("duplicate")) {
        return reply.code(409).send({
          error: { code: "conflict", message: "Username already exists" },
        });
      }
      throw err;
    }
  });

  app.patch<{
    Params: { id: string };
    Body: {
      displayName?: string | null;
      role?: string;
      isActive?: boolean;
      password?: string;
    };
  }>("/api/v1/users/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const id = request.params.id;
    const existing = await getPool().query<DbUser>(
      `SELECT id, username, password_hash, display_name, is_active, role
       FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (!existing.rows[0]) {
      return reply.code(404).send({
        error: { code: "not_found", message: "User not found" },
      });
    }

    let displayName = existing.rows[0].display_name;
    let role = roleFromDb(existing.rows[0].role);
    let isActive = existing.rows[0].is_active;
    let passwordHash = existing.rows[0].password_hash;

    if (request.body?.displayName !== undefined) {
      const v = request.body.displayName;
      displayName = typeof v === "string" ? v.trim() || null : null;
    }
    if (request.body?.role !== undefined) {
      const parsed = parseRole(request.body.role);
      if (!parsed) {
        return reply.code(400).send({
          error: { code: "bad_request", message: "role must be admin or viewer" },
        });
      }
      role = parsed;
    }
    if (typeof request.body?.isActive === "boolean") {
      isActive = request.body.isActive;
    }
    if (request.body?.password) {
      if (request.body.password.length < 6) {
        return reply.code(400).send({
          error: {
            code: "bad_request",
            message: "password must be at least 6 characters",
          },
        });
      }
      passwordHash = await hashPassword(request.body.password);
    }

    // Prevent locking yourself out as the only admin
    if (
      request.user!.id === id &&
      (role !== "admin" || isActive === false)
    ) {
      return reply.code(400).send({
        error: {
          code: "bad_request",
          message: "Cannot demote or deactivate your own admin account",
        },
      });
    }

    const result = await getPool().query<UserRow>(
      `UPDATE users
       SET display_name = $2, role = $3, is_active = $4, password_hash = $5, updated_at = NOW()
       WHERE id = $1
       RETURNING id, username, display_name, is_active, role, created_at`,
      [id, displayName, role, isActive, passwordHash]
    );
    return { user: mapUser(result.rows[0]) };
  });
};
