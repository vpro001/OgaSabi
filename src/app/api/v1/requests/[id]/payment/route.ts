import { route, assertUuid } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";

import { startDeposit } from "@/server/services/payments";

export const POST = route<{ id: string }>(
  { auth: true, rateLimit: Rules.write },
  async ({ user, params }) => ok(await startDeposit(user, assertUuid(params.id, "Request"))),
);
