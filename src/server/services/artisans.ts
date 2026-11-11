import { type z } from "zod";
import { db } from "@/server/db/client";
import { getEnv } from "@/env";
import { Errors } from "@/server/http/errors";
import { hmac } from "@/server/auth/tokens";
import { deleteObject, isValidKey, keyOwner, publicUrl } from "@/server/providers/storage";
import { audit, createNotifications, deliverNotifications } from "@/server/services/notifications";
import { recomputeTrustSoon } from "@/server/trust/engine";
import { MAX_POINTS, PROVISIONAL_BELOW_JOBS } from "@/server/trust/formula";
import { normalizePhone } from "@/lib/phone";
import {
  type artisanProfileSchema,
  type availabilitySchema,
  type portfolioAddSchema,
  type verificationSubmitSchema,
} from "@/lib/schemas";
import { Prisma } from "@/generated/prisma/client";

let postgisCache: boolean | undefined;
export async function hasPostgis(): Promise<boolean> {
  if (postgisCache !== undefined) return postgisCache;
  const rows = await db.$queryRaw<{ ok: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'artisan_profiles' AND column_name = 'location'
    ) AS ok`;
  postgisCache = rows[0]?.ok ?? false;
  return postgisCache;
}

/** "Rumuola" + "Port Harcourt" → "Rumuola, Port Harcourt", without repeating a city already in the label. */
export function joinPlace(area: string | null, city: string | null): string | null {
  if (!area) return city;
  if (!city || area.toLowerCase().includes(city.toLowerCase())) return area;
  return `${area}, ${city}`;
}

export type SearchParams = {
  q?: string;
  category?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  availableNow?: boolean;
  verifiedOnly?: boolean;
  minRating?: number;
  sort: "recommended" | "distance" | "trust" | "rating";
  limit: number;
  offset: number;
  favoritesOf?: string;
};

type SearchRow = {
  id: string;
  businessName: string;
  areaLabel: string | null;
  city: string | null;
  trustScore: number;
  trustTier: "NEW" | "TRUSTED" | "HIGHLY_TRUSTED" | "TOP_RATED";
  verificationLevel: string;
  completedJobsCount: number;
  ratingAverage: number | null;
  ratingCount: number;
  calloutMinKobo: number | null;
  calloutMaxKobo: number | null;
  availableNow: boolean;
  responseTimeMedianSec: number | null;
  yearsExperience: number;
  distanceKm: number | null;
  headline: string | null;
  avatarKey: string | null;
  total: number;
};

/** Nearest-first / best-first artisan search. Uses the PostGIS GiST index when it exists. */
export async function searchArtisans(p: SearchParams) {
  const env = getEnv();
  const geo = p.lat != null && p.lng != null;
  const radiusKm = Math.min(p.radiusKm ?? env.SEARCH_DEFAULT_RADIUS_KM, env.SEARCH_MAX_RADIUS_KM);
  const postgis = geo ? await hasPostgis() : false;

  const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${p.lng ?? 0}, ${p.lat ?? 0}), 4326)::geography`;
  const haversine = Prisma.sql`(6371 * 2 * asin(sqrt(
      power(sin(radians(a."lat" - ${p.lat ?? 0}) / 2), 2) +
      cos(radians(${p.lat ?? 0})) * cos(radians(a."lat")) * power(sin(radians(a."lng" - ${p.lng ?? 0}) / 2), 2))))`;
  const distance = !geo
    ? Prisma.sql`NULL::float`
    : postgis
      ? Prisma.sql`(ST_Distance(a."location", ${point}) / 1000.0)`
      : haversine;

  const where: Prisma.Sql[] = [
    Prisma.sql`a."status" = 'ACTIVE'`,
    Prisma.sql`a."deletedAt" IS NULL`,
  ];
  if (geo) {
    if (postgis) {
      where.push(Prisma.sql`ST_DWithin(a."location", ${point}, ${radiusKm * 1000})`);
    } else {
      const dLat = radiusKm / 111;
      const dLng = radiusKm / (111 * Math.max(0.1, Math.cos(((p.lat ?? 0) * Math.PI) / 180)));
      where.push(
        Prisma.sql`a."lat" BETWEEN ${(p.lat ?? 0) - dLat} AND ${(p.lat ?? 0) + dLat}`,
        Prisma.sql`a."lng" BETWEEN ${(p.lng ?? 0) - dLng} AND ${(p.lng ?? 0) + dLng}`,
        Prisma.sql`${haversine} <= ${radiusKm}`,
      );
    }
  }
  if (p.category) {
    where.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "artisan_categories" ac JOIN "categories" c ON c."id" = ac."categoryId"
      WHERE ac."artisanId" = a."id" AND c."slug" = ${p.category})`);
  }
  if (p.q) {
    const like = `%${p.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    where.push(Prisma.sql`(
      a."businessName" ILIKE ${like} OR a."bio" ILIKE ${like} OR a."areaLabel" ILIKE ${like} OR a."city" ILIKE ${like}
      OR EXISTS (
        SELECT 1 FROM "artisan_categories" ac JOIN "categories" c ON c."id" = ac."categoryId"
        WHERE ac."artisanId" = a."id" AND (c."name" ILIKE ${like} OR c."description" ILIKE ${like})))`);
  }
  const availableExpr = Prisma.sql`(a."isAvailableNow" AND (a."availableNowUntil" IS NULL OR a."availableNowUntil" > now()))`;
  if (p.availableNow) where.push(availableExpr);
  if (p.verifiedOnly) where.push(Prisma.sql`a."verificationLevel" <> 'NONE'`);
  if (p.minRating) where.push(Prisma.sql`a."ratingAverage" >= ${p.minRating}`);
  if (p.favoritesOf) {
    where.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "favorites" f WHERE f."artisanId" = a."id" AND f."userId" = ${p.favoritesOf}::uuid)`,
    );
  }

  const order =
    p.sort === "distance" && geo
      ? Prisma.sql`"distanceKm" ASC NULLS LAST, a."trustScore" DESC`
      : p.sort === "rating"
        ? Prisma.sql`a."ratingAverage" DESC NULLS LAST, a."ratingCount" DESC`
        : p.sort === "trust" || !geo
          ? Prisma.sql`a."trustScore" DESC, a."id" DESC`
          : // Recommended: trust, minus a small penalty per km, plus a boost for being free right now.
            Prisma.sql`(a."trustScore" - LEAST(${distance}, 50) * 0.8 + CASE WHEN ${availableExpr} THEN 6 ELSE 0 END) DESC, a."id" DESC`;

  const rows = await db.$queryRaw<SearchRow[]>`
    SELECT a."id", a."businessName", a."areaLabel", a."city", a."trustScore", a."trustTier", a."verificationLevel",
      a."completedJobsCount", a."ratingAverage", a."ratingCount", a."calloutMinKobo", a."calloutMaxKobo",
      ${availableExpr} AS "availableNow", a."responseTimeMedianSec", a."yearsExperience",
      ${distance} AS "distanceKm",
      (SELECT c."name" FROM "artisan_categories" ac JOIN "categories" c ON c."id" = ac."categoryId"
        WHERE ac."artisanId" = a."id" ORDER BY ac."isPrimary" DESC, c."sortOrder" ASC LIMIT 1) AS "headline",
      u."avatarKey",
      COUNT(*) OVER()::int AS "total"
    FROM "artisan_profiles" a JOIN "users" u ON u."id" = a."userId"
    WHERE ${Prisma.join(where, " AND ")}
    ORDER BY ${order}
    LIMIT ${p.limit} OFFSET ${p.offset}`;

  const total = rows[0]?.total ?? 0;
  return {
    total,
    nextCursor: p.offset + rows.length < total ? String(p.offset + rows.length) : null,
    artisans: rows.map((r) => ({
      id: r.id,
      businessName: r.businessName,
      headline: r.headline ?? "Artisan",
      areaLabel: joinPlace(r.areaLabel, r.city),
      trustScore: r.trustScore,
      trustTier: r.trustTier,
      isVerified: r.verificationLevel !== "NONE",
      isProvisional: r.completedJobsCount < PROVISIONAL_BELOW_JOBS,
      completedJobsCount: r.completedJobsCount,
      ratingAverage: r.ratingAverage,
      ratingCount: r.ratingCount,
      calloutMinKobo: r.calloutMinKobo,
      calloutMaxKobo: r.calloutMaxKobo,
      isAvailableNow: r.availableNow,
      responseTimeMedianSec: r.responseTimeMedianSec,
      yearsExperience: r.yearsExperience,
      distanceKm: r.distanceKm == null ? null : Math.round(r.distanceKm * 10) / 10,
      avatarUrl: r.avatarKey ? publicUrl(r.avatarKey) : null,
    })),
  };
}

export async function listCategories() {
  const rows = await db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      iconKey: true,
      _count: {
        select: { artisans: { where: { artisan: { status: "ACTIVE", deletedAt: null } } } },
      },
    },
  });
  return rows.map(({ _count, ...c }) => ({ ...c, artisanCount: _count.artisans }));
}

export async function getPublicProfile(id: string, viewerId: string | null) {
  const a = await db.artisanProfile.findFirst({
    where: { id, deletedAt: null },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, avatarKey: true, createdAt: true },
      },
      categories: {
        include: { category: { select: { id: true, name: true, slug: true, iconKey: true } } },
        orderBy: { isPrimary: "desc" },
      },
      portfolio: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take: 24,
      },
      availability: { orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }] },
    },
  });
  const isOwner = !!a && a.userId === viewerId;
  if (!a || (a.status !== "ACTIVE" && !isOwner)) throw Errors.notFound("Artisan");

  const [favorite, snapshot, ratingRows] = await Promise.all([
    viewerId
      ? db.favorite.findUnique({ where: { userId_artisanId: { userId: viewerId, artisanId: id } } })
      : null,
    db.trustScoreSnapshot.findFirst({ where: { artisanId: id }, orderBy: { computedAt: "desc" } }),
    db.review.groupBy({
      by: ["rating"],
      where: { artisanId: id, status: "PUBLISHED" },
      _count: true,
    }),
  ]);
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: ratingRows.find((r) => r.rating === star)?._count ?? 0,
  }));
  const availableNow =
    a.isAvailableNow && (!a.availableNowUntil || a.availableNowUntil > new Date());

  return {
    id: a.id,
    businessName: a.businessName,
    ownerName: `${a.user.firstName} ${a.user.lastName.charAt(0)}.`,
    ownerUserId: a.user.id,
    avatarUrl: a.user.avatarKey ? publicUrl(a.user.avatarKey) : null,
    memberSince: a.user.createdAt,
    headline: a.categories[0]?.category.name ?? "Artisan",
    bio: a.bio ?? "",
    yearsExperience: a.yearsExperience,
    status: a.status,
    categories: a.categories.map((c) => ({ ...c.category, isPrimary: c.isPrimary })),
    verificationLevel: a.verificationLevel,
    areaLabel: a.areaLabel,
    city: a.city,
    state: a.state,
    // Rounded to ~1 km: enough to draw a service area, not enough to find a front door.
    approxLat: a.lat == null ? null : Math.round(a.lat * 100) / 100,
    approxLng: a.lng == null ? null : Math.round(a.lng * 100) / 100,
    serviceRadiusKm: a.serviceRadiusKm,
    calloutMinKobo: a.calloutMinKobo,
    calloutMaxKobo: a.calloutMaxKobo,
    isAvailableNow: availableNow,
    availableNowUntil: availableNow ? a.availableNowUntil : null,
    responseTimeMedianSec: a.responseTimeMedianSec,
    trustScore: a.trustScore,
    trustTier: a.trustTier,
    isProvisional: a.completedJobsCount < PROVISIONAL_BELOW_JOBS,
    completedJobsCount: a.completedJobsCount,
    completionRate: a.completionRate,
    ratingAverage: a.ratingAverage,
    ratingCount: a.ratingCount,
    ratingDistribution: distribution,
    trust: snapshot
      ? {
          components: snapshot.components as Record<string, number>,
          max: MAX_POINTS,
          computedAt: snapshot.computedAt,
          formulaVersion: snapshot.formulaVersion,
        }
      : null,
    portfolio: a.portfolio.map((p) => ({ id: p.id, url: p.url, caption: p.caption })),
    availability: a.availability.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startMinute: s.startMinute,
      endMinute: s.endMinute,
    })),
    isFavorite: !!favorite,
    isOwner,
  };
}

export async function listReviews(artisanId: string, cursor: string | undefined, limit: number) {
  const rows = await db.review.findMany({
    where: { artisanId, status: "PUBLISHED", ...(cursor ? { id: { lt: cursor } } : {}) },
    orderBy: { id: "desc" },
    take: limit + 1,
    select: {
      id: true,
      rating: true,
      tags: true,
      comment: true,
      replyBody: true,
      repliedAt: true,
      createdAt: true,
      author: { select: { firstName: true, lastName: true } },
      request: { select: { category: { select: { name: true } } } },
    },
  });
  const page = rows.slice(0, limit);
  return {
    nextCursor: rows.length > limit ? (page[page.length - 1]?.id ?? null) : null,
    reviews: page.map((r) => ({
      id: r.id,
      rating: r.rating,
      tags: r.tags,
      comment: r.comment,
      replyBody: r.replyBody,
      repliedAt: r.repliedAt,
      createdAt: r.createdAt,
      authorName: `${r.author.firstName} ${r.author.lastName.charAt(0)}.`,
      jobCategory: r.request.category.name,
    })),
  };
}

// ── The artisan's own profile ──────────────────────────────────────────────────────────────

export async function getOwnProfile(userId: string) {
  const a = await db.artisanProfile.findFirst({
    where: { userId, deletedAt: null },
    include: {
      categories: { select: { categoryId: true, isPrimary: true } },
      availability: { orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }] },
      portfolio: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      },
      verifications: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!a) return null;
  const v = a.verifications[0];
  const availableNow =
    a.isAvailableNow && (!a.availableNowUntil || a.availableNowUntil > new Date());
  return {
    id: a.id,
    status: a.status,
    businessName: a.businessName,
    bio: a.bio ?? "",
    yearsExperience: a.yearsExperience,
    categoryIds: a.categories.map((c) => c.categoryId),
    primaryCategoryId:
      a.categories.find((c) => c.isPrimary)?.categoryId ?? a.categories[0]?.categoryId ?? null,
    areaLabel: a.areaLabel ?? "",
    city: a.city ?? "",
    state: a.state ?? "",
    lat: a.lat,
    lng: a.lng,
    serviceRadiusKm: a.serviceRadiusKm,
    calloutMinKobo: a.calloutMinKobo,
    calloutMaxKobo: a.calloutMaxKobo,
    whatsappNumber: a.whatsappNumber ?? "",
    isAvailableNow: availableNow,
    availableNowUntil: availableNow ? a.availableNowUntil : null,
    verificationLevel: a.verificationLevel,
    trustScore: a.trustScore,
    trustTier: a.trustTier,
    completedJobsCount: a.completedJobsCount,
    ratingAverage: a.ratingAverage,
    ratingCount: a.ratingCount,
    responseTimeMedianSec: a.responseTimeMedianSec,
    availability: a.availability.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startMinute: s.startMinute,
      endMinute: s.endMinute,
    })),
    portfolio: a.portfolio.map((p) => ({ id: p.id, url: p.url, caption: p.caption })),
    verification: v
      ? {
          id: v.id,
          status: v.status,
          idType: v.idType,
          documentLast4: v.documentLast4,
          rejectionReason: v.rejectionReason,
          createdAt: v.createdAt,
          reviewedAt: v.reviewedAt,
        }
      : null,
  };
}

/** Creates the profile on first save (granting ARTISAN) or updates it. Saving publishes it. */
export async function saveOwnProfile(userId: string, input: z.infer<typeof artisanProfileSchema>) {
  let whatsapp: string | null = null;
  if (input.whatsappNumber) {
    whatsapp = normalizePhone(input.whatsappNumber);
    if (!whatsapp) {
      throw Errors.validation("whatsappNumber: Enter a valid phone number", {
        fields: { whatsappNumber: "Enter a valid phone number, e.g. 0803 123 4567" },
      });
    }
  }
  const categories = await db.category.count({
    where: { id: { in: input.categoryIds }, isActive: true },
  });
  if (categories !== new Set(input.categoryIds).size)
    throw Errors.badRequest("One of the selected trades no longer exists.");

  const existing = await db.artisanProfile.findUnique({
    where: { userId },
    select: { id: true, status: true, deletedAt: true },
  });
  if (existing?.status === "SUSPENDED")
    throw Errors.forbidden("Your artisan profile is suspended.");
  const fields = {
    businessName: input.businessName,
    bio: input.bio,
    yearsExperience: input.yearsExperience,
    areaLabel: input.areaLabel,
    city: input.city,
    state: input.state,
    lat: input.lat,
    lng: input.lng,
    serviceRadiusKm: input.serviceRadiusKm,
    calloutMinKobo: input.calloutMinKobo,
    calloutMaxKobo: input.calloutMaxKobo,
    whatsappNumber: whatsapp,
    status: "ACTIVE" as const,
  };
  const artisanId = await db.$transaction(async (tx) => {
    const profile = existing
      ? await tx.artisanProfile.update({
          where: { id: existing.id },
          data: fields,
          select: { id: true },
        })
      : await tx.artisanProfile.create({ data: { ...fields, userId }, select: { id: true } });
    await tx.artisanCategory.deleteMany({ where: { artisanId: profile.id } });
    await tx.artisanCategory.createMany({
      data: [...new Set(input.categoryIds)].map((categoryId) => ({
        artisanId: profile.id,
        categoryId,
        isPrimary: categoryId === input.primaryCategoryId,
      })),
    });
    if (!existing) {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { roles: true },
      });
      if (!user.roles.includes("ARTISAN")) {
        await tx.user.update({ where: { id: userId }, data: { roles: { push: "ARTISAN" } } });
      }
      // Sensible default hours so a new profile is bookable straight away: Mon-Sat, 8am-6pm.
      await tx.availabilitySlot.createMany({
        data: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
          artisanId: profile.id,
          dayOfWeek,
          startMinute: 480,
          endMinute: 1080,
        })),
      });
    }
    return profile.id;
  });
  if (!existing) recomputeTrustSoon(artisanId, "MANUAL");
  return getOwnProfile(userId);
}

async function requireOwnArtisan(userId: string) {
  const a = await db.artisanProfile.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!a) throw Errors.forbidden("Set up your artisan profile first.");
  return a;
}

export async function saveAvailability(userId: string, input: z.infer<typeof availabilitySchema>) {
  const a = await requireOwnArtisan(userId);
  const byDay = new Map<number, { startMinute: number; endMinute: number }[]>();
  for (const s of input.slots) byDay.set(s.dayOfWeek, [...(byDay.get(s.dayOfWeek) ?? []), s]);
  for (const slots of byDay.values()) {
    slots.sort((x, y) => x.startMinute - y.startMinute);
    for (let i = 1; i < slots.length; i++) {
      if (slots[i]!.startMinute < slots[i - 1]!.endMinute)
        throw Errors.validation("Working hours on the same day must not overlap.");
    }
  }
  await db.$transaction([
    db.availabilitySlot.deleteMany({ where: { artisanId: a.id } }),
    db.availabilitySlot.createMany({ data: input.slots.map((s) => ({ ...s, artisanId: a.id })) }),
  ]);
}

export async function setAvailableNow(userId: string, available: boolean, hours: number) {
  const a = await requireOwnArtisan(userId);
  if (a.status !== "ACTIVE") throw Errors.forbidden("Your profile is not active.");
  const until = available ? new Date(Date.now() + hours * 3_600_000) : null;
  await db.artisanProfile.update({
    where: { id: a.id },
    data: { isAvailableNow: available, availableNowUntil: until },
  });
  return { isAvailableNow: available, availableNowUntil: until };
}

function assertOwnedKey(key: string, userId: string, prefix: string) {
  if (!isValidKey(key) || keyOwner(key) !== userId || !key.startsWith(prefix)) {
    throw Errors.badRequest("That file could not be used. Upload it again.");
  }
}

export async function addPortfolioPhoto(userId: string, input: z.infer<typeof portfolioAddSchema>) {
  const a = await requireOwnArtisan(userId);
  assertOwnedKey(input.storageKey, userId, "pub/portfolio/");
  const count = await db.portfolioPhoto.count({ where: { artisanId: a.id, deletedAt: null } });
  if (count >= 24)
    throw Errors.conflict("You can show up to 24 photos. Remove one to add another.");
  const row = await db.portfolioPhoto.create({
    data: {
      artisanId: a.id,
      storageKey: input.storageKey,
      url: publicUrl(input.storageKey),
      caption: input.caption ?? null,
      categoryId: input.categoryId ?? null,
      sortOrder: count,
    },
  });
  return { id: row.id, url: row.url, caption: row.caption };
}

export async function removePortfolioPhoto(userId: string, photoId: string) {
  const a = await requireOwnArtisan(userId);
  const photo = await db.portfolioPhoto.findFirst({
    where: { id: photoId, artisanId: a.id, deletedAt: null },
  });
  if (!photo) throw Errors.notFound("Photo");
  await db.portfolioPhoto.update({ where: { id: photo.id }, data: { deletedAt: new Date() } });
  await deleteObject(photo.storageKey).catch(() => undefined);
}

export async function submitVerification(
  userId: string,
  input: z.infer<typeof verificationSubmitSchema>,
  ip: string,
) {
  const a = await requireOwnArtisan(userId);
  assertOwnedKey(input.documentKey, userId, "priv/verification/");
  if (input.selfieKey) assertOwnedKey(input.selfieKey, userId, "priv/verification/");
  const pending = await db.identityVerification.findFirst({
    where: { artisanId: a.id, status: "PENDING" },
  });
  if (pending)
    throw Errors.conflict("Your documents are already being reviewed.", "VERIFICATION_PENDING");

  const row = await db.identityVerification.create({
    data: {
      artisanId: a.id,
      idType: input.idType,
      documentKey: input.documentKey,
      selfieKey: input.selfieKey ?? null,
      // Only a keyed hash and the last 4 characters are kept (ADR-008).
      documentNumberHash: hmac(`id:${input.idType}:${input.documentNumber}`),
      documentLast4: input.documentNumber.slice(-4),
    },
  });
  const admins = await db.user.findMany({
    where: { roles: { has: "ADMIN" }, status: "ACTIVE" },
    select: { id: true },
  });
  const ids = await db.$transaction(async (tx) => {
    await audit(tx, {
      actorId: userId,
      actorRole: "ARTISAN",
      action: "verification.submit",
      entityType: "identity_verification",
      entityId: row.id,
      ip,
    });
    return createNotifications(
      tx,
      admins.map((admin) => ({
        userId: admin.id,
        type: "VERIFICATION_UPDATE" as const,
        title: "New identity verification to review",
        body: "An artisan submitted identity documents.",
        href: "/admin/verifications",
      })),
    );
  });
  deliverNotifications(ids);
  return { id: row.id, status: row.status };
}

export async function toggleFavorite(userId: string, artisanId: string, on: boolean) {
  if (on) {
    const exists = await db.artisanProfile.findFirst({
      where: { id: artisanId, status: "ACTIVE", deletedAt: null },
      select: { id: true },
    });
    if (!exists) throw Errors.notFound("Artisan");
    await db.favorite.upsert({
      where: { userId_artisanId: { userId, artisanId } },
      create: { userId, artisanId },
      update: {},
    });
  } else {
    await db.favorite.deleteMany({ where: { userId, artisanId } });
  }
  return { isFavorite: on };
}

export async function platformStats() {
  const [artisans, verified, completed, cities] = await Promise.all([
    db.artisanProfile.count({ where: { status: "ACTIVE", deletedAt: null } }),
    db.artisanProfile.count({
      where: { status: "ACTIVE", deletedAt: null, verificationLevel: { not: "NONE" } },
    }),
    db.serviceRequest.count({ where: { status: "COMPLETED" } }),
    db.artisanProfile.findMany({
      where: { status: "ACTIVE", deletedAt: null, city: { not: null } },
      distinct: ["city"],
      select: { city: true },
    }),
  ]);
  return {
    artisans,
    verified,
    completedJobs: completed,
    cities: cities.map((c) => c.city as string).sort(),
  };
}
