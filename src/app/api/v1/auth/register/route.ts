import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import { issueSession, setSessionCookies } from "@/server/auth/session";
import * as auth from "@/server/services/auth";
import * as S from "@/lib/schemas";

export const POST = route(
  { body: S.registerSchema, rateLimit: Rules.register },
  async ({ body, ip, userAgent, req }) => {
    const user = await auth.register(body);
    const tokens = await issueSession(user, { ip, userAgent });
    const res = ok(
      { user: await auth.getMe(user.id), ...mobileTokens(req.headers, tokens) },
      { status: 201 },
    );
    setSessionCookies(res, tokens);
    return res;
  },
);

function mobileTokens(
  headers: Headers,
  t: { accessToken: string; refreshToken: string; expiresInSec: number },
) {
  return headers.get("x-client-type") === "mobile"
    ? { accessToken: t.accessToken, refreshToken: t.refreshToken, expiresInSec: t.expiresInSec }
    : {};
}
