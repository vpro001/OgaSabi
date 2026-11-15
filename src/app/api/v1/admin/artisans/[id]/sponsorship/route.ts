import { type z } from "zod";
import { route, assertUuid } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import * as settings from "@/server/services/settings";

export const POST = route<{ id: string }, z.infer<typeof settings.sponsorshipSchema>>(
  { auth: true, roles: ["ADMIN"], body: settings.sponsorshipSchema },
  async ({ user, params, body, ip, userAgent, requestId }) =>
    ok(
      await settings.setSponsorship(user, assertUuid(params.id, "Artisan"), body.days, {
        ip,
        userAgent,
        requestId,
      }),
    ),
);
