import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import * as artisans from "@/server/services/artisans";
import * as S from "@/lib/schemas";

export const POST = route(
  { auth: true, body: S.verificationSubmitSchema, rateLimit: Rules.write },
  async ({ user, body, ip }) =>
    ok(await artisans.submitVerification(user.id, body, ip), { status: 201 }),
);
