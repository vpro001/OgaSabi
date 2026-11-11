import { z } from "zod";
import { route, assertUuid } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import * as requests from "@/server/services/requests";
import * as S from "@/lib/schemas";

const querySchema = z.object({ after: z.uuid().optional() });

export const GET = route<{ id: string }, undefined, z.infer<typeof querySchema>>(
  { auth: true, query: querySchema },
  async ({ user, params, query }) =>
    ok({
      messages: await requests.listMessages(user, assertUuid(params.id, "Request"), query.after),
    }),
);

export const POST = route<{ id: string }, z.infer<typeof S.messageSchema>>(
  { auth: true, body: S.messageSchema, rateLimit: Rules.message },
  async ({ user, params, body }) =>
    ok(await requests.sendMessage(user, assertUuid(params.id, "Request"), body.body), {
      status: 201,
    }),
);
