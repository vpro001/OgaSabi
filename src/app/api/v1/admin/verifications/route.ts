import { z } from "zod";
import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import * as admin from "@/server/services/admin";

const querySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
});
export const GET = route({ auth: true, roles: ["ADMIN"], query: querySchema }, async ({ query }) =>
  ok(await admin.listVerifications(query.status)),
);
