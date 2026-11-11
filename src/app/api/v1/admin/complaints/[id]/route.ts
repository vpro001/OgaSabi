import { type z } from "zod";
import { route, assertUuid } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import * as admin from "@/server/services/admin";

export const POST = route<{ id: string }, z.infer<typeof admin.complaintDecisionSchema>>(
  { auth: true, roles: ["ADMIN"], body: admin.complaintDecisionSchema },
  async ({ user, params, body, ip, userAgent, requestId }) => {
    await admin.decideComplaint(user, assertUuid(params.id), body, { ip, userAgent, requestId });
    return ok({ decided: true });
  },
);
