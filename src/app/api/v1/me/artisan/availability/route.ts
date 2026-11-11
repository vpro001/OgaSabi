import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import * as artisans from "@/server/services/artisans";
import * as S from "@/lib/schemas";

export const PUT = route(
  { auth: true, body: S.availabilitySchema, rateLimit: Rules.write },
  async ({ user, body }) => {
    await artisans.saveAvailability(user.id, body);
    return ok({ saved: true });
  },
);
