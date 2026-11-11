import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import * as auth from "@/server/services/auth";
import * as S from "@/lib/schemas";

export const POST = route(
  { body: S.resetPasswordSchema, rateLimit: Rules.passwordReset },
  async ({ body, ip }) => {
    await auth.resetPassword(body, ip);
    return ok({ reset: true });
  },
);
