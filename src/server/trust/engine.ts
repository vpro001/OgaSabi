import { db } from "@/server/db/client";
import { logger } from "@/server/logger";
import { type Prisma, type TrustTrigger } from "@/generated/prisma/client";
import { computeTrust, FORMULA_VERSION, type TrustInputs, type TrustResult } from "./formula";

const DAY_MS = 86_400_000;

export async function gatherTrustInputs(
  artisanId: string,
  now = new Date(),
): Promise<TrustInputs | null> {
  const artisan = await db.artisanProfile.findUnique({
    where: { id: artisanId },
    select: { userId: true, verificationLevel: true },
  });
  if (!artisan) return null;

  const [counts, reviews, response, complaints, disputes] = await Promise.all([
    db.$queryRaw<
      {
        completed: number;
        artisanCancelled: number;
        expired: number;
        customers: number;
        lastCompleted: Date | null;
      }[]
    >`
      SELECT
        COUNT(*) FILTER (WHERE "status" = 'COMPLETED')::int AS "completed",
        COUNT(*) FILTER (WHERE "status" = 'CANCELLED' AND "cancelledByRole" = 'ARTISAN')::int AS "artisanCancelled",
        COUNT(*) FILTER (WHERE "status" = 'EXPIRED' AND "firstResponseAt" IS NULL)::int AS "expired",
        COUNT(DISTINCT "customerId") FILTER (WHERE "status" = 'COMPLETED')::int AS "customers",
        MAX("completedAt") FILTER (WHERE "status" = 'COMPLETED') AS "lastCompleted"
      FROM "service_requests" WHERE "artisanId" = ${artisanId}::uuid`,
    db.review.findMany({
      where: { artisanId, status: "PUBLISHED" },
      select: { rating: true, trustWeight: true },
    }),
    db.$queryRaw<{ median: number | null }[]>`
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("firstResponseAt" - "createdAt")))::float AS "median"
      FROM (
        SELECT "firstResponseAt", "createdAt" FROM "service_requests"
        WHERE "artisanId" = ${artisanId}::uuid AND "firstResponseAt" IS NOT NULL
        ORDER BY "createdAt" DESC LIMIT 100
      ) recent`,
    db.complaint.findMany({
      where: { againstUserId: artisan.userId, status: "UPHELD" },
      select: { severity: true, resolvedAt: true, createdAt: true },
    }),
    db.dispute.findMany({
      where: {
        request: { artisanId },
        status: { in: ["RESOLVED_FOR_CUSTOMER", "RESOLVED_SPLIT"] },
      },
      select: { status: true, resolvedAt: true, createdAt: true },
    }),
  ]);

  const c = counts[0] ?? {
    completed: 0,
    artisanCancelled: 0,
    expired: 0,
    customers: 0,
    lastCompleted: null,
  };
  const age = (d: Date) => (now.getTime() - d.getTime()) / DAY_MS;
  return {
    verificationLevel: artisan.verificationLevel,
    completedJobs: c.completed,
    artisanCancellations: c.artisanCancelled,
    expiredRequests: c.expired,
    reviews: reviews.map((r) => ({ rating: r.rating, weight: r.trustWeight })),
    medianResponseSec: response[0]?.median ?? null,
    repeatCustomerJobs: Math.max(0, c.completed - c.customers),
    daysSinceLastCompletedJob: c.lastCompleted ? age(c.lastCompleted) : null,
    upheldComplaints: complaints.map((x) => ({
      severity: x.severity,
      ageDays: age(x.resolvedAt ?? x.createdAt),
    })),
    lostDisputes: disputes.map((x) => ({
      weight: x.status === "RESOLVED_FOR_CUSTOMER" ? 1 : 0.5,
      ageDays: age(x.resolvedAt ?? x.createdAt),
    })),
  };
}

/** Recomputes one artisan's score, stores a snapshot and refreshes the denormalised read model. */
export async function recomputeTrust(
  artisanId: string,
  trigger: TrustTrigger,
): Promise<TrustResult | null> {
  const inputs = await gatherTrustInputs(artisanId);
  if (!inputs) return null;
  const result = computeTrust(inputs);
  await db.$transaction([
    db.trustScoreSnapshot.create({
      data: {
        artisanId,
        score: result.score,
        tier: result.tier,
        isProvisional: result.isProvisional,
        components: result.components as unknown as Prisma.InputJsonValue,
        inputs: {
          ...inputs,
          reviews: undefined,
          reviewCount: inputs.reviews.length,
        } as unknown as Prisma.InputJsonValue,
        formulaVersion: FORMULA_VERSION,
        trigger,
      },
    }),
    db.artisanProfile.update({
      where: { id: artisanId },
      data: {
        trustScore: result.score,
        trustTier: result.tier,
        completedJobsCount: inputs.completedJobs,
        completionRate: result.completionRate,
        ratingAverage: result.ratingAverage,
        ratingCount: result.ratingCount,
        responseTimeMedianSec:
          inputs.medianResponseSec == null ? null : Math.round(inputs.medianResponseSec),
        trustComputedAt: new Date(),
      },
    }),
  ]);
  return result;
}

/** Fire-and-forget variant for request paths: a scoring failure must never fail the user's action. */
export function recomputeTrustSoon(artisanId: string, trigger: TrustTrigger): void {
  recomputeTrust(artisanId, trigger).catch((err) =>
    logger.error({ err, artisanId, trigger }, "trust recompute failed"),
  );
}

export async function recomputeAllTrust(trigger: TrustTrigger = "NIGHTLY"): Promise<number> {
  const artisans = await db.artisanProfile.findMany({
    where: { deletedAt: null, status: { not: "DRAFT" } },
    select: { id: true },
  });
  let done = 0;
  for (const a of artisans) {
    try {
      await recomputeTrust(a.id, trigger);
      done += 1;
    } catch (err) {
      logger.error({ err, artisanId: a.id }, "nightly trust recompute failed");
    }
  }
  return done;
}
