import { z } from "zod";
import { route, assertUuid } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import * as artisans from "@/server/services/artisans";

const querySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});

export const GET = route<{ id: string }, undefined, z.infer<typeof querySchema>>(
  { query: querySchema },
  async ({ params, query }) => {
    const result = await artisans.listReviews(
      assertUuid(params.id, "Artisan"),
      query.cursor,
      query.limit,
    );
    return ok({ reviews: result.reviews }, { meta: { nextCursor: result.nextCursor } });
  },
);
