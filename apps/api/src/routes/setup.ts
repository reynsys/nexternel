import type { FastifyPluginAsync } from "fastify";
import { getPool } from "../db.js";
import { hashPassword, signAccessToken, signRefreshToken } from "../auth/tokens.js";
import { clearAuthCookies, setAuthCookies } from "../auth/plugin.js";
import { config } from "../config.js";
import { APP_VERSION } from "../version.js";
import {
  bootstrapInstallationState,
  getUserCount,
  isSetupComplete,
  markSetupComplete,
} from "../installation-meta.js";
import { resolveRoleInfo } from "../auth/roles.js";
import { themePrefsFromDb } from "../auth/theme-prefs.js";

export const setupRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/setup/status", async () => {
    const state = await bootstrapInstallationState();
    const lanIp = config.serverIp()?.trim() || null;
    return {
      needsSetup: state.needsSetup,
      version: APP_VERSION,
      serverIp: lanIp,
      installationReady: !state.needsSetup,
    };
  });

  app.post<{
    Body: { username?: string; password?: string; confirmPassword?: string };
  }>("/api/v1/setup/complete", async (request, reply) => {
    if (await isSetupComplete()) {
      return reply.code(400).send({
        error: { code: "already_setup", message: "Nexternel is already configured." },
      });
    }
    if ((await getUserCount()) > 0) {
      await markSetupComplete();
      return reply.code(400).send({
        error: { code: "already_setup", message: "An administrator account already exists." },
      });
    }

    const username = request.body?.username?.trim() ?? "";
    const password = request.body?.password ?? "";
    const confirmPassword = request.body?.confirmPassword ?? "";

    if (!username || username.length < 2) {
      return reply.code(400).send({
        error: { code: "bad_request", message: "Username must be at least 2 characters." },
      });
    }
    if (!password || password.length < 8) {
      return reply.code(400).send({
        error: { code: "bad_request", message: "Password must be at least 8 characters." },
      });
    }
    if (password !== confirmPassword) {
      return reply.code(400).send({
        error: { code: "bad_request", message: "Passwords do not match." },
      });
    }

    const pool = getPool();
    const existing = await pool.query(`SELECT id FROM users WHERE username = $1 LIMIT 1`, [
      username,
    ]);
    if ((existing.rowCount ?? 0) > 0) {
      return reply.code(400).send({
        error: { code: "bad_request", message: "That username is already in use." },
      });
    }

    const passwordHash = await hashPassword(password);
    const inserted = await pool.query<{
      id: string;
      username: string;
      display_name: string;
      role: string;
      theme_prefs: unknown;
      avatar_data: string | null;
    }>(
      `INSERT INTO users (username, password_hash, display_name, role, is_active)
       VALUES ($1, $2, $3, 'admin', true)
       RETURNING id, username, display_name, role, theme_prefs, avatar_data`,
      [username, passwordHash, "Administrator"]
    );
    const user = inserted.rows[0];
    if (!user) {
      return reply.code(500).send({
        error: { code: "setup_failed", message: "Could not create administrator account." },
      });
    }

    await markSetupComplete();

    const roleInfo = await resolveRoleInfo(user.role);
    const claims = {
      userId: user.id,
      username: user.username,
      role: roleInfo.slug,
      isAdmin: roleInfo.isAdmin,
      permissions: roleInfo.permissions,
    };
    const accessToken = await signAccessToken(claims);
    const refreshToken = await signRefreshToken(claims);
    clearAuthCookies(reply);
    setAuthCookies(reply, accessToken, refreshToken);

    return {
      ok: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: roleInfo.slug,
        roleName: roleInfo.name,
        isAdmin: roleInfo.isAdmin,
        permissions: roleInfo.permissions,
        themePrefs: themePrefsFromDb(user.theme_prefs),
        avatarData: user.avatar_data ?? null,
      },
    };
  });
};
