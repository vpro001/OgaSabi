import { type NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/env";
import { safeEqual, signFileUrl } from "@/server/auth/tokens";
import { fail } from "@/server/http/response";
import { isValidKey, MIME_BY_EXT, readLocalObject, s3ReadUrl } from "@/server/providers/storage";

/**
 * Serves uploaded files. `pub/` objects are world-readable and cached; `priv/` objects need a
 * signature that expires (see `signedUrl`). With S3 storage this route only redirects.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!isValidKey(key)) return fail("NOT_FOUND", "File not found.", 404);
  const isPrivate = key.startsWith("priv/");
  if (isPrivate) {
    const url = new URL(req.url);
    const exp = Number(url.searchParams.get("exp"));
    const sig = url.searchParams.get("sig") ?? "";
    if (!exp || exp < Date.now() / 1000 || !safeEqual(sig, signFileUrl(key, exp))) {
      return fail("FORBIDDEN", "This link has expired.", 403);
    }
  }
  if (getEnv().STORAGE_PROVIDER === "s3") return NextResponse.redirect(s3ReadUrl(key), 302);
  const bytes = await readLocalObject(key);
  if (!bytes) return fail("NOT_FOUND", "File not found.", 404);
  const ext = key.split(".").pop() ?? "";
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": MIME_BY_EXT[ext] ?? "application/octet-stream",
      "content-length": String(bytes.length),
      "cache-control": isPrivate ? "private, no-store" : "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
      "content-disposition": "inline",
      "content-security-policy": "default-src 'none'; sandbox",
    },
  });
}
