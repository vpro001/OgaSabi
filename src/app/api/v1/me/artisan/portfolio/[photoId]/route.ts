import { route, assertUuid } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import * as artisans from "@/server/services/artisans";

export const DELETE = route<{ photoId: string }>(
  { auth: true, rateLimit: Rules.write },
  async ({ user, params }) => {
    await artisans.removePortfolioPhoto(user.id, assertUuid(params.photoId, "Photo"));
    return ok({ removed: true });
  },
);
