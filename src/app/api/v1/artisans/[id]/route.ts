import { route, assertUuid } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import * as artisans from "@/server/services/artisans";

export const GET = route<{ id: string }>({}, async ({ params, user }) =>
  ok(await artisans.getPublicProfile(assertUuid(params.id, "Artisan"), user?.id ?? null)),
);
