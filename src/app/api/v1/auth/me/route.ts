import { z } from "zod";
import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import { clearSessionCookies } from "@/server/auth/session";
import * as auth from "@/server/services/auth";
import { Errors } from "@/server/http/errors";
import * as S from "@/lib/schemas";

export const GET = route({ auth: true }, async ({ user }) => ok(await auth.getMe(user.id)));

export const PATCH = route(
  { auth: true, body: S.updateProfileSchema, rateLimit: Rules.write },
  async ({ user, body }) => ok(await auth.updateProfile(user.id, body)),
);

export const DELETE = route(
  { auth: true, body: z.object({ password: z.string().min(1).max(128) }), rateLimit: Rules.login },
  async ({ user, body, ip }) => {
    if (user.roles.includes("ADMIN"))
      throw Errors.forbidden("Administrator accounts cannot be deleted from here.");
    await auth.deleteAccount(user.id, body.password, ip);
    const res = ok({ deleted: true });
    clearSessionCookies(res);
    return res;
  },
);
