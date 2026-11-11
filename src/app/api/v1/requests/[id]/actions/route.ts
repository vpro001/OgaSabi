import { route, assertUuid } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import * as requests from "@/server/services/requests";
import * as S from "@/lib/schemas";

export const POST = route<{ id: string }, S.RequestAction>(
  { auth: true, body: S.requestActionSchema, rateLimit: Rules.write },
  async ({ user, params, body }) =>
    ok(await requests.performAction(user, assertUuid(params.id, "Request"), body)),
);
