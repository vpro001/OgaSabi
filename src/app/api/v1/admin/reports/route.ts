import { z } from "zod";
import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import * as admin from "@/server/services/admin";

const querySchema = z.object({ open: z.enum(["true", "false"]).default("true") });
export const GET = route({ auth: true, roles: ["ADMIN"], query: querySchema }, async ({ query }) =>
  ok(await admin.listReports(query.open === "true")),
);
