import { z } from "zod";
import { db } from "@/server/db/client";
import { getEnv } from "@/env";
import { Errors } from "@/server/http/errors";
import { type SessionUser } from "@/server/auth/session";
import { audit, createNotifications, deliverNotifications } from "@/server/services/notifications";
import {
  DEFAULT_PLATFORM_SETTINGS,
  MAX_SERVICE_FEE_BPS,
  MAX_SPONSORED_SLOTS,
  type PlatformSettings,
} from "@/lib/fees";

// Monetisation switches (ADR-023). Read from the database on every use, so a change in the
// admin console takes effect on the next request on every instance, with no deploy.

type Meta = { ip: string; userAgent: string | null; requestId: string };

const SETTINGS_ID = 1;
const select = {
  serviceFeeEnabled: true,
  serviceFeeBps: true,
  sponsoredEnabled: true,
  sponsoredSlots: true,
} as const;

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const row = await db.platformSettings.findUnique({ where: { id: SETTINGS_ID }, select });
  return row ?? DEFAULT_PLATFORM_SETTINGS;
}

export const platformSettingsSchema = z.object({
  serviceFeeEnabled: z.boolean(),
  serviceFeeBps: z
    .number()
    .int()
    .min(0)
    .max(MAX_SERVICE_FEE_BPS, `The fee cannot be more than ${MAX_SERVICE_FEE_BPS / 100}%`),
  sponsoredEnabled: z.boolean(),
  sponsoredSlots: z.number().int().min(1).max(MAX_SPONSORED_SLOTS),
});

export async function updatePlatformSettings(
  admin: SessionUser,
  input: z.infer<typeof platformSettingsSchema>,
  meta: Meta,
): Promise<PlatformSettings> {
  return db.$transaction(async (tx) => {
    const before =
      (await tx.platformSettings.findUnique({ where: { id: SETTINGS_ID }, select })) ??
      DEFAULT_PLATFORM_SETTINGS;
    const after = await tx.platformSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...input },
      update: input,
      select,
    });
    await audit(tx, {
      actorId: admin.id,
      actorRole: "ADMIN",
      action: "settings.monetisation.update",
      entityType: "platform_settings",
      entityId: String(SETTINGS_ID),
      before,
      after,
      ...meta,
    });
    return after;
  });
}

/** Everything the Monetisation tab shows: the switches, what they have earned, who is sponsored. */
export async function monetisationOverview() {
  const now = new Date();
  const [settings, fees, sponsored] = await Promise.all([
    getPlatformSettings(),
    db.payment.aggregate({
      where: { status: "SUCCEEDED", platformFeeKobo: { gt: 0 } },
      _sum: { platformFeeKobo: true },
      _count: true,
    }),
    db.artisanProfile.findMany({
      where: { sponsoredUntil: { gt: now }, deletedAt: null },
      orderBy: { sponsoredUntil: "asc" },
      take: 100,
      select: {
        id: true,
        businessName: true,
        city: true,
        status: true,
        trustScore: true,
        sponsoredUntil: true,
      },
    }),
  ]);
  return {
    settings,
    paymentsEnabled: getEnv().PAYMENTS_ENABLED,
    feesCollectedKobo: fees._sum.platformFeeKobo ?? 0,
    feePayments: fees._count,
    sponsored,
  };
}

export const sponsorshipSchema = z.object({
  /** Days from now; 0 ends the sponsorship at once. */
  days: z.number().int().min(0).max(365),
});

/**
 * Starts, extends or ends an artisan's sponsored placement. Payment for it is agreed outside the
 * app for now. Only active, ID-verified artisans qualify, so money never puts an unchecked
 * person at the top of a search.
 */
export async function setSponsorship(
  admin: SessionUser,
  artisanId: string,
  days: number,
  meta: Meta,
): Promise<{ sponsoredUntil: Date | null }> {
  const artisan = await db.artisanProfile.findFirst({
    where: { id: artisanId, deletedAt: null },
    select: {
      id: true,
      userId: true,
      status: true,
      verificationLevel: true,
      sponsoredUntil: true,
    },
  });
  if (!artisan) throw Errors.notFound("Artisan");
  if (days > 0) {
    if (artisan.status !== "ACTIVE")
      throw Errors.conflict("Only an active artisan profile can be sponsored.");
    if (artisan.verificationLevel === "NONE")
      throw Errors.conflict("Verify this artisan's ID before sponsoring them.");
  }
  const sponsoredUntil = days > 0 ? new Date(Date.now() + days * 86_400_000) : null;
  const ids = await db.$transaction(async (tx) => {
    await tx.artisanProfile.update({ where: { id: artisan.id }, data: { sponsoredUntil } });
    await audit(tx, {
      actorId: admin.id,
      actorRole: "ADMIN",
      action: sponsoredUntil ? "artisan.sponsor" : "artisan.unsponsor",
      entityType: "artisan",
      entityId: artisan.id,
      before: { sponsoredUntil: artisan.sponsoredUntil },
      after: { sponsoredUntil, days },
      ...meta,
    });
    if (!sponsoredUntil) return [];
    return createNotifications(tx, [
      {
        userId: artisan.userId,
        type: "ACCOUNT_NOTICE",
        title: "Your profile is now sponsored",
        body: `You appear near the top of matching searches, marked "Sponsored", for the next ${days} days. Your trust score is not affected.`,
        href: "/artisan",
      },
    ]);
  });
  deliverNotifications(ids);
  return { sponsoredUntil };
}
