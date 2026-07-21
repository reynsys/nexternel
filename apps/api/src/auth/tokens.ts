import { SignJWT, jwtVerify, errors as JoseErrors } from "jose";
import bcrypt from "bcryptjs";
import { config } from "../config.js";

export type AuthRole = "admin" | "viewer";

export type TokenPayload = {
  userId: string;
  username: string;
  role: AuthRole;
  tokenType: "access" | "refresh";
};

function secretKey() {
  return new TextEncoder().encode(config.jwtSecret());
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signAccessToken(
  payload: Omit<TokenPayload, "tokenType">
) {
  return new SignJWT({
    username: payload.username,
    role: payload.role,
    tokenType: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(config.accessTtl)
    .sign(secretKey());
}

export async function signRefreshToken(
  payload: Omit<TokenPayload, "tokenType">
) {
  return new SignJWT({
    username: payload.username,
    role: payload.role,
    tokenType: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(config.refreshTtl)
    .sign(secretKey());
}

export type VerifyResult =
  | { ok: true; payload: TokenPayload }
  | { ok: false; reason: string };

export async function verifyTokenDetailed(token: string): Promise<VerifyResult> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      clockTolerance: "60s",
    });

    const userId =
      (typeof payload.sub === "string" && payload.sub) ||
      (typeof payload.userId === "string" ? payload.userId : undefined);
    const username =
      typeof payload.username === "string" ? payload.username : undefined;
    const role = payload.role as AuthRole | undefined;
    const rawType = payload.tokenType ?? payload.token_type;
    const tokenType =
      rawType === "access" || rawType === "refresh" ? rawType : undefined;

    if (!userId || !username || !role) {
      return {
        ok: false,
        reason: `claims_missing:userId=${Boolean(userId)},username=${Boolean(username)},role=${Boolean(role)},keys=${Object.keys(payload).join("|")}`,
      };
    }

    return {
      ok: true,
      payload: {
        userId,
        username,
        role,
        tokenType: tokenType ?? "access",
      },
    };
  } catch (err) {
    const msg =
      err instanceof JoseErrors.JOSEError
        ? `${err.code}:${err.message}`
        : err instanceof Error
          ? err.message
          : String(err);
    return { ok: false, reason: `jwt:${msg}` };
  }
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  const result = await verifyTokenDetailed(token);
  return result.ok ? result.payload : null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function roleFromDb(role: string | null | undefined): AuthRole {
  return role === "viewer" ? "viewer" : "admin";
}
