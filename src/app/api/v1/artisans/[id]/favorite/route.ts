import { route, assertUuid } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import * as artisans from "@/server/services/artisans";

export const PUT = route<{ id: string }>(
  { auth: true, rateLimit: Rules.write },
  async ({ params, user }) =>
    ok(await artisans.toggleFavorite(user.id, assertUuid(params.id, "Artisan"), true)),
);
export const DELETE = route<{ id: string }>(
  { auth: true, rateLimit: Rules.write },
  async ({ params, user }) =>
    ok(await artisans.toggleFavorite(user.id, assertUuid(params.id, "Artisan"), false)),
);
