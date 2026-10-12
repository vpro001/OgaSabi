import { type NextRequest } from "next/server";
import { db } from "@/server/db/client";
import { ok, fail } from "@/server/http/response";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const artisan = await db.artisanProfile.findUnique({
      where: { id },
      include: {
        categories: {
          include: { category: { select: { name: true, slug: true } } },
        },
        portfolio: {
          where: { deletedAt: null },
          select: { url: true, caption: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
        },
        verifications: {
          where: { status: "APPROVED" },
          select: {
            levelGranted: true,
            status: true,
            idType: true,
            documentLast4: true,
          },
          take: 1,
        },
      },
    });

    if (!artisan || artisan.status !== "ACTIVE" || artisan.deletedAt) {
      return fail("NOT_FOUND", "Artisan not found", 404);
    }

    const primaryCategory = artisan.categories[0]?.category?.name ?? "General";

    return ok({
      id: artisan.id,
      businessName: artisan.businessName,
      headline: primaryCategory,
      bio: artisan.bio ?? "",
      yearsExperience: artisan.yearsExperience,
      categories: artisan.categories.map((c: { category: { name: string; slug: string } }) => ({
        name: c.category.name,
        slug: c.category.slug,
      })),
      status: artisan.status,
      verificationLevel: artisan.verificationLevel,
      areaLabel: artisan.areaLabel ?? "Unknown",
      city: artisan.city ?? "Lagos",
      state: artisan.state ?? "Lagos",
      serviceRadiusKm: artisan.serviceRadiusKm,
      calloutMinKobo: artisan.calloutMinKobo ?? null,
      calloutMaxKobo: artisan.calloutMaxKobo ?? null,
      isAvailableNow: artisan.isAvailableNow ?? false,
      trustScore: artisan.trustScore,
      trustTier: artisan.trustTier,
      completedJobsCount: artisan.completedJobsCount ?? 0,
      ratingAverage: artisan.ratingAverage ?? null,
      ratingCount: artisan.ratingCount ?? 0,
      responseTimeMedianSec: artisan.responseTimeMedianSec ?? null,
      lat: artisan.lat ?? 0,
      lng: artisan.lng ?? 0,
      portfolio: artisan.portfolio.map((p: { url: string; caption?: string | null }) => ({
        url: p.url,
        alt: p.caption ?? undefined,
      })),
      identityVerification: artisan.verifications[0] ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load artisan";
    return fail("INTERNAL_ERROR", message, 500);
  }
}
