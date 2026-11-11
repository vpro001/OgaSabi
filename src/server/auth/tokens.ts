import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "@/env";

export type AccessClaims = { sub: string; roles: string[]; fid: string };

const ISSUER = "ogasabi";
const secret = () => new TextEncoder().encode(getEnv().JWT_ACCESS_SECRET);

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  return new SignJWT({ roles: claims.roles, fid: claims.fid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${getEnv().ACCESS_TOKEN_TTL_SEC}s`)
    .sign(secret());
}

export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.fid !== "string") return null;
    const roles = Array.isArray(payload.roles) ? payload.roles.map(String) : [];
    return { sub: payload.sub, roles, fid: payload.fid };
  } catch {
    return null;
  }
}

/** Opaque refresh token: only its SHA-256 is stored. */
export function newRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(48).toString("base64url");
  return { token, hash: sha256(token) };
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmac(value: string): string {
  return createHmac("sha256", getEnv().DATA_HMAC_SECRET).update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function newOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Signs `path|expiry` so private files can be fetched for a short time without a session. */
export function signFileUrl(key: string, expiresAtSec: number): string {
  return hmac(`file:${key}:${expiresAtSec}`);
}
