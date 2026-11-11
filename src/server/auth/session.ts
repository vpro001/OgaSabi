import { type NextRequest, type NextResponse } from "next/server";
import { getEnv } from "@/env";
import { db } from "@/server/db/client";
import { Errors } from "@/server/http/errors";
import { newRefreshToken, sha256, signAccessToken, verifyAccessToken } from "@/server/auth/tokens";
import { type UserRole } from "@/generated/prisma/client";

export const ACCESS_COOKIE = "og_at";
export const REFRESH_COOKIE = "og_rt";
/** Not a credential: only tells the proxy and the UI that a session probably exists. */
export const HINT_COOKIE = "og_s";
const REFRESH_PATH = "/api/v1/auth";

export type SessionUser = {
  id: string;
  roles: UserRole[];
  familyId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  artisanId: string | null;
};

export type IssuedTokens = { accessToken: string; refreshToken: string; expiresInSec: number };

type ClientInfo = { ip?: string | null; userAgent?: string | null };

function cookieBase() {
  const env = getEnv();
  return {
    httpOnly: true,
    secure: env.APP_URL.startsWith("https://"),
    sameSite: "lax" as const,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export async function issueSession(
  user: { id: string; roles: UserRole[] },
  client: ClientInfo,
  familyId?: string,
): Promise<IssuedTokens & { refreshId: string; familyId: string }> {
  const env = getEnv();
  const { token, hash } = newRefreshToken();
  const row = await db.refreshToken.create({
    data: {
      userId: user.id,
      familyId: familyId ?? crypto.randomUUID(),
      tokenHash: hash,
      userAgent: client.userAgent?.slice(0, 300) ?? null,
      ip: client.ip ?? null,
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
    },
  });
  const accessToken = await signAccessToken({
    sub: user.id,
    roles: user.roles,
    fid: row.familyId,
  });
  return {
    accessToken,
    refreshToken: token,
    expiresInSec: env.ACCESS_TOKEN_TTL_SEC,
    refreshId: row.id,
    familyId: row.familyId,
  };
}

/** Rotates a refresh token. Presenting an already-rotated token revokes the whole family. */
export async function rotateSession(refreshToken: string, client: ClientInfo) {
  const row = await db.refreshToken.findUnique({
    where: { tokenHash: sha256(refreshToken) },
    include: { user: { select: { id: true, roles: true, status: true, deletedAt: true } } },
  });
  if (!row) throw Errors.unauthorized("Your session has ended. Please sign in again.");
  if (row.usedAt || row.revokedAt) {
    await db.refreshToken.updateMany({
      where: { familyId: row.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw Errors.unauthorized("Your session has ended. Please sign in again.");
  }
  if (row.expiresAt < new Date() || row.user.status !== "ACTIVE" || row.user.deletedAt) {
    throw Errors.unauthorized("Your session has ended. Please sign in again.");
  }
  // Claim the token first so two concurrent refreshes cannot both succeed.
  const claimed = await db.refreshToken.updateMany({
    where: { id: row.id, usedAt: null, revokedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1)
    throw Errors.unauthorized("Your session has ended. Please sign in again.");
  const issued = await issueSession(row.user, client, row.familyId);
  await db.refreshToken.update({ where: { id: row.id }, data: { replacedById: issued.refreshId } });
  return issued;
}

export async function revokeFamily(familyId: string): Promise<void> {
  await db.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessions(userId: string, exceptFamilyId?: string): Promise<void> {
  await db.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptFamilyId ? { familyId: { not: exceptFamilyId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

export function setSessionCookies(res: NextResponse, tokens: IssuedTokens): void {
  const env = getEnv();
  const base = cookieBase();
  const refreshMaxAge = env.REFRESH_TOKEN_TTL_DAYS * 86_400;
  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    path: "/",
    maxAge: tokens.expiresInSec,
  });
  res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    path: REFRESH_PATH,
    maxAge: refreshMaxAge,
  });
  res.cookies.set(HINT_COOKIE, "1", { ...base, httpOnly: false, path: "/", maxAge: refreshMaxAge });
}

export function clearSessionCookies(res: NextResponse): void {
  const base = cookieBase();
  res.cookies.set(ACCESS_COOKIE, "", { ...base, path: "/", maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { ...base, path: REFRESH_PATH, maxAge: 0 });
  res.cookies.set(HINT_COOKIE, "", { ...base, httpOnly: false, path: "/", maxAge: 0 });
}

export function readAccessToken(req: NextRequest): { token: string; viaCookie: boolean } | null {
  const header = req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    return { token: header.slice(7).trim(), viaCookie: false };
  }
  const cookie = req.cookies.get(ACCESS_COOKIE)?.value;
  return cookie ? { token: cookie, viaCookie: true } : null;
}

/**
 * Resolves the signed-in user. The token proves identity; the row is re-read so that a
 * suspension, role change or deletion takes effect immediately rather than at token expiry.
 */
export async function resolveSession(
  req: NextRequest,
): Promise<{ user: SessionUser; viaCookie: boolean } | null> {
  const found = readAccessToken(req);
  if (!found) return null;
  const claims = await verifyAccessToken(found.token);
  if (!claims) return null;
  const user = await db.user.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      roles: true,
      status: true,
      deletedAt: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      artisanProfile: { select: { id: true, deletedAt: true } },
    },
  });
  if (!user || user.status !== "ACTIVE" || user.deletedAt) return null;
  return {
    viaCookie: found.viaCookie,
    user: {
      id: user.id,
      roles: user.roles,
      familyId: claims.fid,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      artisanId:
        user.artisanProfile && !user.artisanProfile.deletedAt ? user.artisanProfile.id : null,
    },
  };
}
