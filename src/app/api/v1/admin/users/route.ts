import { z } from "zod";
import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import * as admin from "@/server/services/admin";

const querySchema = z.object({
  q: z.string().trim().max(80).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});
export const GET = route(
  { auth: true, roles: ["ADMIN"], query: querySchema },
  async ({ query }) => {
    const result = await admin.listUsers(query.q || undefined, query.cursor, query.limit);
    return ok({ users: result.users }, { meta: { nextCursor: result.nextCursor } });
  },
);
