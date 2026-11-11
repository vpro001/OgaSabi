import { createHash, createHmac } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getEnv } from "@/env";
import { signFileUrl } from "@/server/auth/tokens";

// Keys look like `pub/portfolio/<owner>/<uuid>.jpg` or `priv/verification/<owner>/<uuid>.jpg`.
// `pub/` objects have a stable public URL. `priv/` objects (ID documents, dispute evidence) are
// only reachable through a short-lived signed URL (ADR-008).
const KEY_PATTERN = /^(pub|priv)\/[a-z]+\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/;

export function isValidKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

export function keyOwner(key: string): string | null {
  return isValidKey(key) ? (key.split("/")[2] ?? null) : null;
}

export function keyPurpose(key: string): string | null {
  return isValidKey(key) ? (key.split("/")[1] ?? null) : null;
}

function localPath(key: string): string {
  if (!isValidKey(key)) throw new Error("invalid storage key");
  return path.resolve(getEnv().UPLOAD_DIR, key);
}

// ── S3 (Signature V4), written against the plain REST API so no SDK is needed ──────────────

const hex = (buf: Buffer) => buf.toString("hex");
const sha = (data: string | Buffer) => createHash("sha256").update(data).digest();
const sign = (key: string | Buffer, data: string) =>
  createHmac("sha256", key).update(data).digest();

function s3Target(key: string) {
  const env = getEnv();
  const region = env.S3_REGION ?? "us-east-1";
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  if (env.S3_ENDPOINT) {
    const base = new URL(env.S3_ENDPOINT); // path-style for S3-compatible stores (R2, MinIO, Spaces)
    return {
      host: base.host,
      origin: base.origin,
      canonicalUri: `/${env.S3_BUCKET}/${encodedKey}`,
      region,
    };
  }
  const host = `${env.S3_BUCKET}.s3.${region}.amazonaws.com`;
  return { host, origin: `https://${host}`, canonicalUri: `/${encodedKey}`, region };
}

function signingKey(date: string, region: string): Buffer {
  const env = getEnv();
  const kDate = sign(`AWS4${env.S3_SECRET_ACCESS_KEY}`, date);
  return sign(sign(sign(kDate, region), "s3"), "aws4_request");
}

function amzDates(now = new Date()) {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate, date: amzDate.slice(0, 8) };
}

async function s3Request(method: "PUT" | "DELETE", key: string, body?: Buffer, mime?: string) {
  const env = getEnv();
  const t = s3Target(key);
  const { amzDate, date } = amzDates();
  const payloadHash = hex(sha(body ?? ""));
  const headers: Record<string, string> = {
    host: t.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (mime) headers["content-type"] = mime;
  const names = Object.keys(headers).sort();
  const canonical = [
    method,
    t.canonicalUri,
    "",
    ...names.map((n) => `${n}:${headers[n]}`),
    "",
    names.join(";"),
    payloadHash,
  ].join("\n");
  const scope = `${date}/${t.region}/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, hex(sha(canonical))].join("\n");
  const signature = hex(sign(signingKey(date, t.region), toSign));
  const res = await fetch(`${t.origin}${t.canonicalUri}`, {
    method,
    headers: {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${env.S3_ACCESS_KEY_ID}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}`,
    },
    body: body ? new Uint8Array(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok && !(method === "DELETE" && res.status === 404)) {
    throw new Error(`S3 ${method} failed with ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

function s3PresignedGet(key: string, ttlSec: number): string {
  const env = getEnv();
  const t = s3Target(key);
  const { amzDate, date } = amzDates();
  const scope = `${date}/${t.region}/s3/aws4_request`;
  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${env.S3_ACCESS_KEY_ID}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(ttlSec),
    "X-Amz-SignedHeaders": "host",
  });
  params.sort();
  const query = params.toString().replace(/\+/g, "%20");
  const canonical = [
    "GET",
    t.canonicalUri,
    query,
    `host:${t.host}`,
    "",
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, hex(sha(canonical))].join("\n");
  const signature = hex(sign(signingKey(date, t.region), toSign));
  return `${t.origin}${t.canonicalUri}?${query}&X-Amz-Signature=${signature}`;
}

// ── Public interface ───────────────────────────────────────────────────────────────────────

export async function putObject(key: string, bytes: Buffer, mime: string): Promise<void> {
  if (getEnv().STORAGE_PROVIDER === "s3") return s3Request("PUT", key, bytes, mime);
  const file = localPath(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
}

export async function deleteObject(key: string): Promise<void> {
  if (!isValidKey(key)) return;
  if (getEnv().STORAGE_PROVIDER === "s3") return s3Request("DELETE", key);
  await unlink(localPath(key)).catch(() => undefined);
}

/** Local-disk read, used by the file route when STORAGE_PROVIDER=mock. */
export async function readLocalObject(key: string): Promise<Buffer | null> {
  try {
    return await readFile(localPath(key));
  } catch {
    return null;
  }
}

export function publicUrl(key: string): string {
  const env = getEnv();
  if (env.STORAGE_PROVIDER === "s3" && env.S3_PUBLIC_BASE_URL) {
    return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  }
  return `/api/v1/files/${key}`;
}

/** A URL that works for `ttlSec` without a session. The only way to read a `priv/` object. */
export function signedUrl(key: string, ttlSec = 300): string {
  if (getEnv().STORAGE_PROVIDER === "s3") return s3PresignedGet(key, ttlSec);
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  return `/api/v1/files/${key}?exp=${exp}&sig=${signFileUrl(key, exp)}`;
}

/** Public objects fetched through our own file route when no CDN base URL is configured. */
export function s3ReadUrl(key: string): string {
  return s3PresignedGet(key, 300);
}

const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    ext: "png",
    test: (b) =>
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: "image/webp",
    ext: "webp",
    test: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP",
  },
  { mime: "application/pdf", ext: "pdf", test: (b) => b.subarray(0, 5).toString() === "%PDF-" },
];

/** Identifies a file by its leading bytes; the browser-supplied content type is never trusted. */
export function sniffFile(bytes: Buffer): { mime: string; ext: string } | null {
  const hit = SIGNATURES.find((s) => s.test(bytes));
  return hit ? { mime: hit.mime, ext: hit.ext } : null;
}

export const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};
