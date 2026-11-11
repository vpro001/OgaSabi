import { type z } from "zod";
import { route, assertUuid } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import * as requests from "@/server/services/requests";
import * as S from "@/lib/schemas";

export const POST = route<{ id: string }, z.infer<typeof S.reviewReplySchema>>(
  { auth: true, body: S.reviewReplySchema, rateLimit: Rules.write },
  async ({ user, params, body }) => {
    await requests.replyToReview(user, assertUuid(params.id, "Review"), body.body);
    return ok({ replied: true });
  },
);
