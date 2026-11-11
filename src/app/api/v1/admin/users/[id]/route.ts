import { z } from "zod";
import { route, assertUuid } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import * as admin from "@/server/services/admin";

const bodySchema = z.object({
  suspended: z.boolean(),
  reason: z.string().trim().min(5, "Give a reason of at least 5 characters").max(300),
});
export const POST = route<{ id: string }, z.infer<typeof bodySchema>>(
  { auth: true, roles: ["ADMIN"], body: bodySchema },
  async ({ user, params, body, ip, userAgent, requestId }) => {
    await admin.setUserSuspended(user, assertUuid(params.id, "User"), body.suspended, body.reason, {
      ip,
      userAgent,
      requestId,
    });
    return ok({ saved: true });
  },
);
