import { type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/server/db/client";
import { ok, fail } from "@/server/http/response";

const artisanQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  radiusKm: z.coerce.number().optional().default(50),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const parsed = artisanQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    radiusKm: url.searchParams.get("radiusKm") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return fail("BAD_REQUEST", parsed.error.issues[0]?.message ?? "Invalid query", 400);
  }

  const query = parsed.data;

  try {
    const where: Record<string, unknown> = {
      status: "ACTIVE",
      deletedAt: null,
    };

    if (query.q) {
      (where as Record<string, unknown>)["OR"] = [
        { businessName: { contains: query.q, mode: "insensitive" } },
        { bio: { contains: query.q, mode: "insensitive" } },
      ];
    }

    if (query.category) {
      (where as Record<string, unknown>)["categories"] = {
        some: { category: { slug: query.category } },
      };
    }

    if (query.cursor) {
      (where as Record<string, unknown>)["id"] = { lt: query.cursor };
    }

    // radiusKm is accepted in the query schema for future client-side filtering,
    // but server-side distance filtering requires user coordinates (not yet available).
    // The `radiusKm` parameter is passed through; a proper implementation would
    // compute a bounding box using the user's location + haversine formula,
    // leveraging the GIST index on the `location` geography column.
    // For now, results are returned without radius filtering.

    const rows = await db.artisanProfile.findMany({
      where: where as never,
      include: {
        categories: {
          include: { category: { select: { name: true, slug: true } } },
          take: 1,
        },
      },
      orderBy: [{ trustScore: "desc" }, { id: "desc" }],
      take: query.limit + 1,
    });

    const hasNext = rows.length > query.limit;
    const page = hasNext ? rows.slice(0, -1) : rows;

    type ArtisanRow = {
      id: string;
      businessName: string;
      areaLabel: string | null;
      trustScore: number;
      trustTier: string;
      completedJobsCount: number | null;
      ratingAverage: number | null;
      ratingCount: number;
      calloutMinKobo: number | null;
      calloutMaxKobo: number | null;
      isAvailableNow: boolean;
      responseTimeMedianSec: number | null;
      categories: { category: { name: string } }[];
    };

    const artisans = page.map((a: ArtisanRow) => {
      const primaryCategory = a.categories?.[0]?.category?.name ?? "General";
      return {
        id: a.id,
        businessName: a.businessName,
        headline: primaryCategory,
        areaLabel: a.areaLabel,
        trustScore: a.trustScore,
        trustTier: a.trustTier,
        completedJobsCount: a.completedJobsCount ?? 0,
        ratingAverage: a.ratingAverage ?? null,
        ratingCount: a.ratingCount ?? 0,
        calloutMinKobo: a.calloutMinKobo ?? null,
        calloutMaxKobo: a.calloutMaxKobo ?? null,
        isAvailableNow: a.isAvailableNow ?? false,
        distanceKm: null as number | null,
        responseTimeMedianSec: a.responseTimeMedianSec ?? null,
        availabilityLabel: null as string | null,
      };
    });

    const nextCursor = hasNext ? (artisans[artisans.length - 1]?.id ?? null) : null;

    return ok({ artisans, nextCursor }, { meta: { nextCursor } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load artisans";
    return fail("INTERNAL_ERROR", message, 500);
  }
}
