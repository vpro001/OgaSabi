import { z } from "zod";
import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";
import * as artisans from "@/server/services/artisans";

const flag = z.enum(["true", "false", "1", "0"]).transform((v) => v === "true" || v === "1");
const querySchema = z
  .object({
    q: z.string().trim().max(80).optional(),
    category: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]{1,60}$/)
      .optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().min(1).max(200).optional(),
    availableNow: flag.optional(),
    verifiedOnly: flag.optional(),
    minRating: z.coerce.number().min(1).max(5).optional(),
    sort: z.enum(["recommended", "distance", "trust", "rating"]).default("recommended"),
    limit: z.coerce.number().int().min(1).max(48).default(12),
    cursor: z.coerce.number().int().min(0).max(5000).default(0),
  })
  .refine((v) => (v.lat == null) === (v.lng == null), {
    message: "lat and lng must be given together",
  });

export const GET = route({ query: querySchema, rateLimit: Rules.search }, async ({ query }) => {
  const { cursor, ...rest } = query;
  const result = await artisans.searchArtisans({ ...rest, q: rest.q || undefined, offset: cursor });
  return ok(
    { artisans: result.artisans },
    { meta: { nextCursor: result.nextCursor, total: result.total } },
  );
});
