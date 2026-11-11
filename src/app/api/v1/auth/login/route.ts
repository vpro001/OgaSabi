import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import { issueSession, setSessionCookies } from "@/server/auth/session";
import * as auth from "@/server/services/auth";
import * as S from "@/lib/schemas";

export const POST = route(
  { body: S.loginSchema, rateLimit: Rules.login },
  async ({ body, ip, userAgent, req }) => {
    const user = await auth.login(body.identifier, body.password);
    const tokens = await issueSession(user, { ip, userAgent });
    const mobile = req.headers.get("x-client-type") === "mobile";
    const res = ok({
      user: await auth.getMe(user.id),
      ...(mobile
        ? {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresInSec: tokens.expiresInSec,
          }
        : {}),
    });
    setSessionCookies(res, tokens);
    return res;
  },
);
