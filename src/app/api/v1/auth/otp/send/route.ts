import { z } from "zod";
import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import * as auth from "@/server/services/auth";
import { Errors } from "@/server/http/errors";

import { db } from "@/server/db/client";

const bodySchema = z.object({ channel: z.enum(["SMS", "EMAIL"]) });

/** Sends a code to the signed-in user's own phone or email so they can verify it. */
export const POST = route(
  { auth: true, body: bodySchema, rateLimit: Rules.otp },
  async ({ user, body, ip }) => {
    const target = body.channel === "SMS" ? user.phone : user.email;
    if (!target)
      throw Errors.badRequest(
        body.channel === "SMS" ? "Add a phone number first." : "Add an email address first.",
      );
    const row = await db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { phoneVerifiedAt: true, emailVerifiedAt: true },
    });
    if (body.channel === "SMS" ? row.phoneVerifiedAt : row.emailVerifiedAt)
      throw Errors.conflict("This is already verified.");
    return ok(
      await auth.sendOtp({
        target,
        channel: body.channel,
        purpose: body.channel === "SMS" ? "VERIFY_PHONE" : "VERIFY_EMAIL",
        userId: user.id,
        ip,
      }),
    );
  },
);
