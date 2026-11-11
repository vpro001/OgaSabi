import { z } from "zod";
import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { NextResponse } from "next/server";
import {
  clearSessionCookies,
  REFRESH_COOKIE,
  rotateSession,
  setSessionCookies,
} from "@/server/auth/session";

const bodySchema = z.object({ refreshToken: z.string().min(20).max(200).optional() });

export const POST = route({}, async ({ req, ip, userAgent }) => {
  const raw = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  const fromBody = parsed.success ? parsed.data.refreshToken : undefined;
  const token = fromBody ?? req.cookies.get(REFRESH_COOKIE)?.value;
  if (!token) {
    const res = NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Sign in to continue." } },
      { status: 401 },
    );
    clearSessionCookies(res);
    return res;
  }
  try {
    const tokens = await rotateSession(token, { ip, userAgent });
    const res = ok(
      fromBody
        ? {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresInSec: tokens.expiresInSec,
          }
        : { expiresInSec: tokens.expiresInSec },
    );
    if (!fromBody) setSessionCookies(res, tokens);
    return res;
  } catch (err) {
    if (err instanceof Error && "status" in err && err.status === 401) {
      const res = NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: err.message } },
        { status: 401 },
      );
      clearSessionCookies(res);
      return res;
    }
    throw err;
  }
});
