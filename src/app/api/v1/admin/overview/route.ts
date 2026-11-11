import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";

import * as admin from "@/server/services/admin";

export const GET = route({ auth: true, roles: ["ADMIN"] }, async () => ok(await admin.overview()));
