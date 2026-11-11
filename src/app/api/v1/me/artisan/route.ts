import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import * as artisans from "@/server/services/artisans";
import * as S from "@/lib/schemas";

export const GET = route({ auth: true }, async ({ user }) =>
  ok(await artisans.getOwnProfile(user.id)),
);
export const PUT = route(
  { auth: true, body: S.artisanProfileSchema, rateLimit: Rules.write },
  async ({ user, body }) => ok(await artisans.saveOwnProfile(user.id, body)),
);
