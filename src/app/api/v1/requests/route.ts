import { z } from "zod";
import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import * as requests from "@/server/services/requests";
import * as S from "@/lib/schemas";

const querySchema = z.object({
  as: z.enum(["customer", "artisan"]).default("customer"),
  group: z.enum(["active", "past", "all"]).default("all"),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const GET = route({ auth: true, query: querySchema }, async ({ user, query }) => {
  const result = await requests.listRequests(user, {
    as: query.as === "artisan" ? "ARTISAN" : "CUSTOMER",
    group: query.group,
    cursor: query.cursor,
    limit: query.limit,
  });
  return ok({ requests: result.requests }, { meta: { nextCursor: result.nextCursor } });
});

export const POST = route(
  { auth: true, body: S.createRequestSchema, rateLimit: Rules.write },
  async ({ user, body, req }) => {
    const key = req.headers.get("idempotency-key")?.slice(0, 100) || null;
    return ok(await requests.createRequest(user, body, key), { status: 201 });
  },
);
