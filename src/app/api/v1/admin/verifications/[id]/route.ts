import { type z } from "zod";
import { route, assertUuid } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import * as admin from "@/server/services/admin";

export const POST = route<{ id: string }, z.infer<typeof admin.verificationDecisionSchema>>(
  { auth: true, roles: ["ADMIN"], body: admin.verificationDecisionSchema },
  async ({ user, params, body, ip, userAgent, requestId }) => {
    await admin.decideVerification(user, assertUuid(params.id), body, { ip, userAgent, requestId });
    return ok({ decided: true });
  },
);
