import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import * as auth from "@/server/services/auth";
import * as S from "@/lib/schemas";

export const POST = route(
  { body: S.forgotPasswordSchema, rateLimit: Rules.passwordReset },
  async ({ body, ip }) => {
    const { devCode } = await auth.forgotPassword(body.identifier, ip);
    // Same answer whether or not the account exists.
    return ok({ sent: true, ...(devCode ? { devCode } : {}) });
  },
);
