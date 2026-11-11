import { type z } from "zod";
import { route, assertUuid } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import * as requests from "@/server/services/requests";
import * as S from "@/lib/schemas";

export const POST = route<{ id: string }, z.infer<typeof S.complaintSchema>>(
  { auth: true, body: S.complaintSchema, rateLimit: Rules.report },
  async ({ user, params, body }) => {
    await requests.fileComplaint(user, assertUuid(params.id, "Request"), body);
    return ok({ filed: true }, { status: 201 });
  },
);
