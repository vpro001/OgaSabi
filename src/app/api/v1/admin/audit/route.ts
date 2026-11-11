import { z } from "zod";
import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import * as admin from "@/server/services/admin";

const querySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export const GET = route(
  { auth: true, roles: ["ADMIN"], query: querySchema },
  async ({ query }) => {
    const result = await admin.listAudit(query.cursor, query.limit);
    return ok({ entries: result.entries }, { meta: { nextCursor: result.nextCursor } });
  },
);
