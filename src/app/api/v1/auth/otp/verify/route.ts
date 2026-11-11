import { z } from "zod";
import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import * as auth from "@/server/services/auth";
import { Errors } from "@/server/http/errors";
import * as S from "@/lib/schemas";

import { db } from "@/server/db/client";

const bodySchema = S.otpVerifySchema.extend({ channel: z.enum(["SMS", "EMAIL"]) });

export const POST = route(
  { auth: true, body: bodySchema, rateLimit: Rules.otp },
  async ({ user, body }) => {
    const target = body.channel === "SMS" ? user.phone : user.email;
    if (!target) throw Errors.badRequest("Nothing to verify.");
    await auth.consumeOtp(
      target,
      body.channel === "SMS" ? "VERIFY_PHONE" : "VERIFY_EMAIL",
      body.code,
    );
    await db.user.update({
      where: { id: user.id },
      data:
        body.channel === "SMS" ? { phoneVerifiedAt: new Date() } : { emailVerifiedAt: new Date() },
    });
    return ok(await auth.getMe(user.id));
  },
);
