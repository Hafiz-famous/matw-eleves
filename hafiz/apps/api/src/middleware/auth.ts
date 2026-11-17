import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const issuer = `${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1`;
const hsSecret = env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
  : null;
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Vérifie un jeton d'accès Supabase Auth.
 * - Secret HS256 (SUPABASE_JWT_SECRET) s'il est configuré ;
 * - sinon clés publiques JWKS du projet (ES256 / RS256).
 */
async function verifySupabaseToken(token: string): Promise<JWTPayload> {
  const header = JSON.parse(
    Buffer.from(token.split(".")[0] ?? "", "base64url").toString("utf8") || "{}",
  ) as { alg?: string };
  const options = { issuer, audience: "authenticated" };

  if (header.alg === "HS256") {
    if (!hsSecret) throw new Error("SUPABASE_JWT_SECRET non configuré");
    return (await jwtVerify(token, hsSecret, { ...options, algorithms: ["HS256"] })).payload;
  }
  return (await jwtVerify(token, jwks, { ...options, algorithms: ["ES256", "RS256"] })).payload;
}

// Cache mémoire des profils déjà synchronisés pour éviter un upsert à chaque requête.
const syncedProfiles = new Map<string, number>();
const PROFILE_SYNC_TTL_MS = 10 * 60 * 1000;

async function ensureProfile(user: AuthUser) {
  const last = syncedProfiles.get(user.id);
  if (last && Date.now() - last < PROFILE_SYNC_TTL_MS) return;
  await prisma.profile.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email, displayName: user.displayName },
    update: { email: user.email, ...(user.displayName ? { displayName: user.displayName } : {}) },
  });
  syncedProfiles.set(user.id, Date.now());
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(AppError.unauthorized());
  }
  const token = header.slice("Bearer ".length).trim();

  let payload: JWTPayload;
  try {
    payload = await verifySupabaseToken(token);
  } catch {
    return next(AppError.unauthorized("Session invalide ou expirée. Veuillez vous reconnecter."));
  }

  if (!payload.sub || !UUID_RE.test(payload.sub)) {
    return next(AppError.unauthorized("Jeton invalide"));
  }

  const meta = (payload.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    (typeof meta.display_name === "string" && meta.display_name) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    null;

  req.user = {
    id: payload.sub,
    email: typeof payload.email === "string" ? payload.email : null,
    displayName,
  };

  try {
    await ensureProfile(req.user);
    next();
  } catch (err) {
    next(err);
  }
}
