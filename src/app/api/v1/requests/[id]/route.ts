import { route, assertUuid } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import * as requests from "@/server/services/requests";

export const GET = route<{ id: string }>({ auth: true }, async ({ user, params }) =>
  ok(await requests.getRequest(user, assertUuid(params.id, "Request"))),
);
