import { type z } from "zod";
import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import * as settings from "@/server/services/settings";

export const GET = route({ auth: true, roles: ["ADMIN"] }, async () =>
  ok(await settings.monetisationOverview()),
);

export const PUT = route<Record<string, never>, z.infer<typeof settings.platformSettingsSchema>>(
  { auth: true, roles: ["ADMIN"], body: settings.platformSettingsSchema },
  async ({ user, body, ip, userAgent, requestId }) =>
    ok({
      settings: await settings.updatePlatformSettings(user, body, { ip, userAgent, requestId }),
    }),
);
