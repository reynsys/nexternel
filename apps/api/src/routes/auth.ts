import type { FastifyPluginAsync } from "fastify";
import { getPool, type DbUser } from "../db.js";
import {
  clearAuthCookies,
  requireUser,
  setAuthCookies,
} from "../auth/plugin.js";
import {
  roleFromDb,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyToken,
  verifyTokenDetailed,
} from "../auth/tokens.js";
import { REFRESH_COOKIE } from "../config.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{
    Body: { username?: string; password?: string };
  }>(
    "/api/v1/auth/login",
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const username = request.body?.username?.trim();
      const password = request.body?.password;
      if (!username || !password) {
        return reply.code(400).send({
          error: { code: "bad_request", message: "Username and password required" },
        });
      }

      const result = await getPool().query<DbUser>(
        `SELECT id, username, password_hash, display_name, is_active, role
         FROM users WHERE username = $1 LIMIT 1`,
        [username]
      );
      const user = result.rows[0];
      if (!user || !user.is_active) {
        return reply.code(401).send({
          error: { code: "invalid_credentials", message: "Invalid credentials" },
        });
      }

      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        return reply.code(401).send({
          error: { code: "invalid_credentials", message: "Invalid credentials" },
        });
      }

      const role = roleFromDb(user.role);
      const claims = { userId: user.id, username: user.username, role };
      const accessToken = await signAccessToken(claims);
      const refreshToken = await signRefreshToken(claims);

      const roundTrip = await verifyTokenDetailed(accessToken);
      if (!roundTrip.ok || roundTrip.payload.tokenType !== "access") {
        request.log.error(
          { roundTrip },
          "access token failed round-trip verify after login"
        );
        return reply.code(500).send({
          error: {
            code: "token_misconfigured",
            message:
              "Server could not verify the token it just created. Check JWT_SECRET / NEXTAUTH_SECRET.",
            debug: roundTrip,
          },
        });
      }

      clearAuthCookies(reply);
      setAuthCookies(reply, accessToken, refreshToken);
      request.log.info({ username: user.username, role }, "login success");

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          role,
        },
      };
    }
  );

  app.post("/api/v1/auth/logout", async (_request, reply) => {
    clearAuthCookies(reply);
    return { ok: true };
  });

  app.post("/api/v1/auth/refresh", async (request, reply) => {
    const token =
      request.cookies[REFRESH_COOKIE] ||
      (typeof request.body === "object" &&
      request.body &&
      "refreshToken" in request.body
        ? String((request.body as { refreshToken?: string }).refreshToken ?? "")
        : "");
    if (!token) {
      return reply.code(401).send({
        error: { code: "unauthorized", message: "Refresh token missing" },
      });
    }
    const payload = await verifyToken(token);
    if (!payload || payload.tokenType !== "refresh") {
      clearAuthCookies(reply);
      return reply.code(401).send({
        error: { code: "unauthorized", message: "Invalid refresh token" },
      });
    }

    const result = await getPool().query<DbUser>(
      `SELECT id, username, display_name, is_active, role
       FROM users WHERE id = $1 LIMIT 1`,
      [payload.userId]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) {
      clearAuthCookies(reply);
      return reply.code(401).send({
        error: { code: "unauthorized", message: "User inactive" },
      });
    }

    const role = roleFromDb(user.role);
    const claims = { userId: user.id, username: user.username, role };
    const accessToken = await signAccessToken(claims);
    const refreshToken = await signRefreshToken(claims);
    setAuthCookies(reply, accessToken, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role,
      },
    };
  });

  app.get("/api/v1/auth/me", async (request, reply) => {
    if (!requireUser(request, reply)) return;
    const result = await getPool().query<DbUser>(
      `SELECT id, username, display_name, is_active, role
       FROM users WHERE id = $1 LIMIT 1`,
      [request.user!.id]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) {
      return reply.code(401).send({
        error: { code: "unauthorized", message: "User not found" },
      });
    }
    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: roleFromDb(user.role),
      },
    };
  });
};
