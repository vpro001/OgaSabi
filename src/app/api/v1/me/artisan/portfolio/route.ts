import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import * as artisans from "@/server/services/artisans";
import * as S from "@/lib/schemas";

export const POST = route(
  { auth: true, body: S.portfolioAddSchema, rateLimit: Rules.write },
  async ({ user, body }) => ok(await artisans.addPortfolioPhoto(user.id, body), { status: 201 }),
);
