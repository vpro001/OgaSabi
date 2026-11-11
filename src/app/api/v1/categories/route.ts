import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import * as artisans from "@/server/services/artisans";

export const GET = route({}, async () =>
  ok(await artisans.listCategories(), {
    headers: { "cache-control": "public, max-age=60, stale-while-revalidate=600" },
  }),
);
