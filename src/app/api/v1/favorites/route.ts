import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import * as artisans from "@/server/services/artisans";

export const GET = route({ auth: true }, async ({ user }) => {
  const result = await artisans.searchArtisans({
    favoritesOf: user.id,
    sort: "trust",
    limit: 48,
    offset: 0,
  });
  return ok({ artisans: result.artisans.map((a) => ({ ...a, isFavorite: true })) });
});
