import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import * as auth from "@/server/services/auth";
import * as S from "@/lib/schemas";

export const POST = route(
  { auth: true, body: S.changePasswordSchema, rateLimit: Rules.login },
  async ({ user, body }) => {
    await auth.changePassword(user.id, user.familyId, body);
    return ok({ changed: true });
  },
);
