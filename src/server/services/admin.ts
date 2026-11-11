import { z } from "zod";
import { db } from "@/server/db/client";
import { Errors } from "@/server/http/errors";
import { type SessionUser } from "@/server/auth/session";
import { revokeAllSessions } from "@/server/auth/session";
import { signedUrl } from "@/server/providers/storage";
import { audit, createNotifications, deliverNotifications } from "@/server/services/notifications";
import { recomputeTrustSoon } from "@/server/trust/engine";
import { type Prisma } from "@/generated/prisma/client";

type Meta = { ip: string; userAgent: string | null; requestId: string };

export async function overview() {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [
    users,
    artisans,
    pendingVerifications,
    openDisputes,
    openComplaints,
    openReports,
    requests30d,
    completed30d,
    byStatus,
  ] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.artisanProfile.count({ where: { status: "ACTIVE", deletedAt: null } }),
    db.identityVerification.count({ where: { status: "PENDING" } }),
    db.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    db.complaint.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    db.report.count({ where: { status: "OPEN" } }),
    db.serviceRequest.count({ where: { createdAt: { gt: since } } }),
    db.serviceRequest.count({ where: { status: "COMPLETED", completedAt: { gt: since } } }),
    db.serviceRequest.groupBy({ by: ["status"], _count: true }),
  ]);
  return {
    users,
    artisans,
    pendingVerifications,
    openDisputes,
    openComplaints,
    openReports,
    requests30d,
    completed30d,
    requestsByStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
  };
}

// ── Identity verification ──────────────────────────────────────────────────────────────────

export async function listVerifications(status: "PENDING" | "APPROVED" | "REJECTED") {
  const rows = await db.identityVerification.findMany({
    where: { status },
    orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
    take: 100,
    include: {
      artisan: {
        select: {
          id: true,
          businessName: true,
          city: true,
          areaLabel: true,
          user: { select: { firstName: true, lastName: true, phone: true, email: true } },
        },
      },
    },
  });
  const hashes = rows.map((r) => r.documentNumberHash).filter((h): h is string => !!h);
  const dupes = hashes.length
    ? await db.identityVerification.groupBy({
        by: ["documentNumberHash"],
        where: { documentNumberHash: { in: hashes } },
        _count: { artisanId: true },
      })
    : [];
  return rows.map((v) => ({
    id: v.id,
    status: v.status,
    idType: v.idType,
    documentLast4: v.documentLast4,
    createdAt: v.createdAt,
    reviewedAt: v.reviewedAt,
    rejectionReason: v.rejectionReason,
    levelGranted: v.levelGranted,
    hasSelfie: !!v.selfieKey,
    // Short-lived links; the files are never public (ADR-008).
    documentUrl: status === "PENDING" ? signedUrl(v.documentKey, 600) : null,
    selfieUrl: status === "PENDING" && v.selfieKey ? signedUrl(v.selfieKey, 600) : null,
    sameIdOnOtherAccounts: Math.max(
      0,
      (dupes.find((d) => d.documentNumberHash === v.documentNumberHash)?._count.artisanId ?? 1) - 1,
    ),
    artisan: {
      id: v.artisan.id,
      businessName: v.artisan.businessName,
      location: [v.artisan.areaLabel, v.artisan.city].filter(Boolean).join(", "),
      ownerName: `${v.artisan.user.firstName} ${v.artisan.user.lastName}`,
      contact: v.artisan.user.phone ?? v.artisan.user.email,
    },
  }));
}

export const verificationDecisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approve"),
    level: z.enum(["ID_VERIFIED", "ID_SELFIE_VERIFIED", "ADMIN_REVIEWED"]),
  }),
  z.object({ decision: z.literal("reject"), reason: z.string().trim().min(5).max(300) }),
]);

export async function decideVerification(
  admin: SessionUser,
  id: string,
  input: z.infer<typeof verificationDecisionSchema>,
  meta: Meta,
) {
  const v = await db.identityVerification.findUnique({
    where: { id },
    include: { artisan: { select: { id: true, userId: true, verificationLevel: true } } },
  });
  if (!v) throw Errors.notFound("Verification");
  if (v.status !== "PENDING") throw Errors.conflict("This verification has already been reviewed.");
  if (
    input.decision === "approve" &&
    input.level !== "ID_VERIFIED" &&
    !v.selfieKey &&
    input.level === "ID_SELFIE_VERIFIED"
  ) {
    throw Errors.validation("No selfie was submitted, so selfie verification cannot be granted.");
  }
  const now = new Date();
  const ids = await db.$transaction(async (tx) => {
    const claimed = await tx.identityVerification.updateMany({
      where: { id, status: "PENDING" },
      data:
        input.decision === "approve"
          ? {
              status: "APPROVED",
              levelGranted: input.level,
              reviewedById: admin.id,
              reviewedAt: now,
            }
          : {
              status: "REJECTED",
              rejectionReason: input.reason,
              reviewedById: admin.id,
              reviewedAt: now,
            },
    });
    if (claimed.count !== 1) throw Errors.conflict("This verification has already been reviewed.");
    if (input.decision === "approve") {
      await tx.identityVerification.updateMany({
        where: { artisanId: v.artisanId, status: "APPROVED", id: { not: id } },
        data: { status: "SUPERSEDED" },
      });
      await tx.artisanProfile.update({
        where: { id: v.artisanId },
        data: { verificationLevel: input.level },
      });
    }
    await audit(tx, {
      actorId: admin.id,
      actorRole: "ADMIN",
      action: `verification.${input.decision}`,
      entityType: "identity_verification",
      entityId: id,
      before: { status: "PENDING", level: v.artisan.verificationLevel },
      after: input,
      ...meta,
    });
    return createNotifications(tx, [
      input.decision === "approve"
        ? {
            userId: v.artisan.userId,
            type: "VERIFICATION_UPDATE",
            title: "Your identity is verified",
            body: "A verified badge now shows on your profile and your trust score has gone up.",
            href: "/artisan/verification",
          }
        : {
            userId: v.artisan.userId,
            type: "VERIFICATION_UPDATE",
            title: "Your identity documents were not accepted",
            body: `Reason: ${input.reason}. You can submit again.`,
            href: "/artisan/verification",
          },
    ]);
  });
  deliverNotifications(ids);
  if (input.decision === "approve") recomputeTrustSoon(v.artisanId, "VERIFICATION_CHANGE");
}

// ── Disputes ───────────────────────────────────────────────────────────────────────────────

const personSelect = {
  select: { id: true, firstName: true, lastName: true, phone: true, email: true },
} as const;

export async function listDisputes(open: boolean) {
  const rows = await db.dispute.findMany({
    where: {
      status: open ? { in: ["OPEN", "UNDER_REVIEW"] } : { notIn: ["OPEN", "UNDER_REVIEW"] },
    },
    orderBy: { createdAt: open ? "asc" : "desc" },
    take: 100,
    include: {
      evidence: { select: { id: true, storageKey: true } },
      openedBy: personSelect,
      request: {
        select: {
          id: true,
          description: true,
          quotedAmountKobo: true,
          finalAmountKobo: true,
          areaLabel: true,
          customer: personSelect,
          artisan: { select: { id: true, businessName: true, user: personSelect } },
          category: { select: { name: true } },
        },
      },
    },
  });
  return rows.map((d) => ({
    id: d.id,
    status: d.status,
    reason: d.reason,
    description: d.description,
    openedByRole: d.openedByRole,
    resolutionNote: d.resolutionNote,
    refundAmountKobo: d.refundAmountKobo,
    createdAt: d.createdAt,
    resolvedAt: d.resolvedAt,
    evidence: d.evidence.map((e) => ({ id: e.id, url: signedUrl(e.storageKey, 600) })),
    request: {
      id: d.request.id,
      description: d.request.description,
      category: d.request.category.name,
      areaLabel: d.request.areaLabel,
      amountKobo: d.request.finalAmountKobo ?? d.request.quotedAmountKobo,
      customer: {
        name: `${d.request.customer.firstName} ${d.request.customer.lastName}`,
        contact: d.request.customer.phone ?? d.request.customer.email,
      },
      artisan: {
        id: d.request.artisan.id,
        businessName: d.request.artisan.businessName,
        contact: d.request.artisan.user.phone ?? d.request.artisan.user.email,
      },
    },
  }));
}

export const disputeDecisionSchema = z.object({
  outcome: z.enum([
    "RESOLVED_FOR_CUSTOMER",
    "RESOLVED_FOR_ARTISAN",
    "RESOLVED_SPLIT",
    "UNDER_REVIEW",
  ]),
  note: z.string().trim().min(10, "Explain the decision in at least 10 characters").max(1000),
  refundAmountKobo: z.number().int().min(0).max(5_000_000_00).optional(),
});

export async function decideDispute(
  admin: SessionUser,
  id: string,
  input: z.infer<typeof disputeDecisionSchema>,
  meta: Meta,
) {
  const d = await db.dispute.findUnique({
    where: { id },
    include: {
      request: {
        select: {
          id: true,
          status: true,
          version: true,
          customerId: true,
          artisanId: true,
          completedAt: true,
          artisan: { select: { userId: true } },
        },
      },
    },
  });
  if (!d) throw Errors.notFound("Dispute");
  if (!["OPEN", "UNDER_REVIEW"].includes(d.status))
    throw Errors.conflict("This dispute is already resolved.");
  const now = new Date();
  const resolving = input.outcome !== "UNDER_REVIEW";
  const ids = await db.$transaction(async (tx) => {
    await tx.dispute.update({
      where: { id },
      data: resolving
        ? {
            status: input.outcome,
            resolutionNote: input.note,
            refundAmountKobo: input.refundAmountKobo ?? null,
            resolvedById: admin.id,
            resolvedAt: now,
          }
        : { status: "UNDER_REVIEW", resolutionNote: input.note },
    });
    await audit(tx, {
      actorId: admin.id,
      actorRole: "ADMIN",
      action: "dispute.decide",
      entityType: "dispute",
      entityId: id,
      before: { status: d.status },
      after: input,
      ...meta,
    });
    if (!resolving) return [];
    const forCustomer = input.outcome === "RESOLVED_FOR_CUSTOMER";
    if (d.request.status === "DISPUTED") {
      await tx.serviceRequest.update({
        where: { id: d.request.id },
        data: forCustomer
          ? {
              status: "CANCELLED",
              cancelledAt: now,
              cancelledById: admin.id,
              cancelledByRole: "ADMIN",
              cancellationReason: "Dispute resolved for the customer",
              version: { increment: 1 },
            }
          : {
              status: "COMPLETED",
              completedAt: d.request.completedAt ?? now,
              version: { increment: 1 },
            },
      });
    }
    await tx.requestEvent.create({
      data: {
        requestId: d.request.id,
        type: "DISPUTE_RESOLVED",
        fromStatus: d.request.status,
        toStatus: forCustomer ? "CANCELLED" : "COMPLETED",
        actorId: admin.id,
        actorRole: "ADMIN",
        metadata: { outcome: input.outcome },
      },
    });
    const label = forCustomer
      ? "in the customer's favour"
      : input.outcome === "RESOLVED_FOR_ARTISAN"
        ? "in the artisan's favour"
        : "with a split outcome";
    return createNotifications(
      tx,
      [d.request.customerId, d.request.artisan.userId].map((userId) => ({
        userId,
        type: "DISPUTE_UPDATE" as const,
        title: `Your dispute was resolved ${label}`,
        body: input.note,
        href: `/requests/${d.request.id}`,
      })),
    );
  });
  deliverNotifications(ids);
  if (resolving) recomputeTrustSoon(d.request.artisanId, "DISPUTE_OUTCOME");
}

// ── Complaints and reports ─────────────────────────────────────────────────────────────────

export async function listComplaints(open: boolean) {
  const rows = await db.complaint.findMany({
    where: { status: open ? { in: ["OPEN", "UNDER_REVIEW"] } : { in: ["UPHELD", "DISMISSED"] } },
    orderBy: [{ severity: "desc" }, { createdAt: open ? "asc" : "desc" }],
    take: 100,
    include: {
      evidence: { select: { id: true, storageKey: true } },
      filedBy: personSelect,
      against: personSelect,
    },
  });
  return rows.map((c) => ({
    id: c.id,
    requestId: c.requestId,
    category: c.category,
    severity: c.severity,
    status: c.status,
    description: c.description,
    filedByRole: c.filedByRole,
    filedBy: `${c.filedBy.firstName} ${c.filedBy.lastName}`,
    against: `${c.against.firstName} ${c.against.lastName}`,
    againstUserId: c.against.id,
    resolutionNote: c.resolutionNote,
    createdAt: c.createdAt,
    evidence: c.evidence.map((e) => ({ id: e.id, url: signedUrl(e.storageKey, 600) })),
  }));
}

export const complaintDecisionSchema = z.object({
  outcome: z.enum(["UPHELD", "DISMISSED", "UNDER_REVIEW"]),
  note: z.string().trim().min(10, "Explain the decision in at least 10 characters").max(1000),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
});

export async function decideComplaint(
  admin: SessionUser,
  id: string,
  input: z.infer<typeof complaintDecisionSchema>,
  meta: Meta,
) {
  const c = await db.complaint.findUnique({
    where: { id },
    include: { against: { select: { artisanProfile: { select: { id: true } } } } },
  });
  if (!c) throw Errors.notFound("Complaint");
  if (!["OPEN", "UNDER_REVIEW"].includes(c.status))
    throw Errors.conflict("This complaint is already resolved.");
  const resolving = input.outcome !== "UNDER_REVIEW";
  const ids = await db.$transaction(async (tx) => {
    await tx.complaint.update({
      where: { id },
      data: {
        status: input.outcome,
        resolutionNote: input.note,
        ...(input.severity ? { severity: input.severity } : {}),
        ...(resolving ? { resolvedById: admin.id, resolvedAt: new Date() } : {}),
      },
    });
    await audit(tx, {
      actorId: admin.id,
      actorRole: "ADMIN",
      action: "complaint.decide",
      entityType: "complaint",
      entityId: id,
      before: { status: c.status, severity: c.severity },
      after: input,
      ...meta,
    });
    if (!resolving) return [];
    const upheld = input.outcome === "UPHELD";
    return createNotifications(tx, [
      {
        userId: c.filedById,
        type: "COMPLAINT_UPDATE",
        title: upheld ? "Your complaint was upheld" : "Your complaint was closed",
        body: input.note,
        href: `/requests/${c.requestId}`,
      },
      ...(upheld
        ? [
            {
              userId: c.againstUserId,
              type: "COMPLAINT_UPDATE" as const,
              title: "A complaint against you was upheld",
              body: input.note,
              href: `/requests/${c.requestId}`,
            },
          ]
        : []),
    ]);
  });
  deliverNotifications(ids);
  if (
    resolving &&
    input.outcome === "UPHELD" &&
    c.filedByRole === "CUSTOMER" &&
    c.against.artisanProfile
  ) {
    recomputeTrustSoon(c.against.artisanProfile.id, "COMPLAINT");
  }
}

export async function listReports(open: boolean) {
  const rows = await db.report.findMany({
    where: { status: open ? "OPEN" : { not: "OPEN" } },
    orderBy: { createdAt: open ? "asc" : "desc" },
    take: 100,
    include: { reporter: personSelect, targetUser: personSelect },
  });
  const reviewIds = rows.map((r) => r.targetReviewId).filter((x): x is string => !!x);
  const messageIds = rows.map((r) => r.targetMessageId).filter((x): x is string => !!x);
  const [reviews, messages] = await Promise.all([
    reviewIds.length
      ? db.review.findMany({
          where: { id: { in: reviewIds } },
          select: { id: true, comment: true, rating: true, status: true },
        })
      : [],
    messageIds.length
      ? db.message.findMany({
          where: { id: { in: messageIds } },
          select: { id: true, body: true, deletedAt: true },
        })
      : [],
  ]);
  return rows.map((r) => {
    const review = reviews.find((x) => x.id === r.targetReviewId);
    const message = messages.find((x) => x.id === r.targetMessageId);
    return {
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetUserId ?? r.targetReviewId ?? r.targetMessageId,
      reason: r.reason,
      details: r.details,
      status: r.status,
      actionTaken: r.actionTaken,
      createdAt: r.createdAt,
      reporter: `${r.reporter.firstName} ${r.reporter.lastName}`,
      excerpt: r.targetUser
        ? `${r.targetUser.firstName} ${r.targetUser.lastName}`
        : review
          ? `${review.rating}★ — ${review.comment ?? "(no comment)"}${review.status !== "PUBLISHED" ? " [hidden]" : ""}`
          : message
            ? `${message.body}${message.deletedAt ? " [removed]" : ""}`
            : "(content no longer exists)",
    };
  });
}

export const reportDecisionSchema = z.object({
  outcome: z.enum(["ACTIONED", "DISMISSED"]),
  /** For ACTIONED: hide the review / remove the message / suspend the user. */
  note: z.string().trim().min(5).max(500),
});

export async function decideReport(
  admin: SessionUser,
  id: string,
  input: z.infer<typeof reportDecisionSchema>,
  meta: Meta,
) {
  const r = await db.report.findUnique({ where: { id } });
  if (!r) throw Errors.notFound("Report");
  if (r.status !== "OPEN") throw Errors.conflict("This report is already closed.");
  let artisanToRescore: string | null = null;
  await db.$transaction(async (tx) => {
    await tx.report.update({
      where: { id },
      data: {
        status: input.outcome,
        actionTaken: input.note,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });
    if (input.outcome === "ACTIONED") {
      if (r.targetReviewId) {
        const review = await tx.review.update({
          where: { id: r.targetReviewId },
          data: { status: "HIDDEN", hiddenReason: input.note },
        });
        artisanToRescore = review.artisanId;
      } else if (r.targetMessageId) {
        await tx.message.update({
          where: { id: r.targetMessageId },
          data: { deletedAt: new Date() },
        });
      }
    }
    await audit(tx, {
      actorId: admin.id,
      actorRole: "ADMIN",
      action: "report.decide",
      entityType: "report",
      entityId: id,
      after: input,
      ...meta,
    });
  });
  if (r.targetUserId && input.outcome === "ACTIONED")
    await setUserSuspended(admin, r.targetUserId, true, input.note, meta);
  if (artisanToRescore) recomputeTrustSoon(artisanToRescore, "REVIEW");
}

// ── Users ──────────────────────────────────────────────────────────────────────────────────

export async function listUsers(q: string | undefined, cursor: string | undefined, limit: number) {
  const where: Prisma.UserWhereInput = { deletedAt: null };
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q.toLowerCase() } },
      { phone: { contains: q.replace(/\s/g, "") } },
      { artisanProfile: { businessName: { contains: q, mode: "insensitive" } } },
    ];
  }
  const rows = await db.user.findMany({
    where: { ...where, ...(cursor ? { id: { lt: cursor } } : {}) },
    orderBy: { id: "desc" },
    take: limit + 1,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      roles: true,
      status: true,
      suspensionReason: true,
      createdAt: true,
      lastLoginAt: true,
      artisanProfile: {
        select: {
          id: true,
          businessName: true,
          trustScore: true,
          verificationLevel: true,
          status: true,
        },
      },
      _count: { select: { customerRequests: true, complaintsAgainst: true } },
    },
  });
  const page = rows.slice(0, limit);
  return {
    nextCursor: rows.length > limit ? (page[page.length - 1]?.id ?? null) : null,
    users: page.map(({ _count, artisanProfile, ...u }) => ({
      ...u,
      artisan: artisanProfile,
      requestCount: _count.customerRequests,
      complaintsAgainst: _count.complaintsAgainst,
    })),
  };
}

export async function setUserSuspended(
  admin: SessionUser,
  userId: string,
  suspended: boolean,
  reason: string,
  meta: Meta,
) {
  if (userId === admin.id) throw Errors.badRequest("You cannot suspend your own account.");
  const user = await db.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      status: true,
      roles: true,
      artisanProfile: { select: { id: true, status: true } },
    },
  });
  if (!user) throw Errors.notFound("User");
  if (user.roles.includes("ADMIN"))
    throw Errors.forbidden("Administrator accounts cannot be suspended here.");
  if ((user.status === "SUSPENDED") === suspended) return;
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: suspended
        ? { status: "SUSPENDED", suspendedAt: new Date(), suspensionReason: reason }
        : { status: "ACTIVE", suspendedAt: null, suspensionReason: null },
    });
    if (user.artisanProfile && user.artisanProfile.status !== "DRAFT") {
      await tx.artisanProfile.update({
        where: { id: user.artisanProfile.id },
        data: { status: suspended ? "SUSPENDED" : "ACTIVE", isAvailableNow: false },
      });
    }
    await audit(tx, {
      actorId: admin.id,
      actorRole: "ADMIN",
      action: suspended ? "user.suspend" : "user.unsuspend",
      entityType: "user",
      entityId: userId,
      before: { status: user.status },
      after: { reason },
      ...meta,
    });
  });
  if (suspended) await revokeAllSessions(userId);
}

export async function listAudit(cursor: string | undefined, limit: number) {
  const rows = await db.auditLog.findMany({
    where: cursor ? { id: { lt: cursor } } : {},
    orderBy: { id: "desc" },
    take: limit + 1,
  });
  const page = rows.slice(0, limit);
  const actors = await db.user.findMany({
    where: { id: { in: page.map((r) => r.actorId).filter((x): x is string => !!x) } },
    select: { id: true, firstName: true, lastName: true },
  });
  return {
    nextCursor: rows.length > limit ? (page[page.length - 1]?.id ?? null) : null,
    entries: page.map((r) => {
      const actor = actors.find((a) => a.id === r.actorId);
      return {
        id: r.id,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        actorRole: r.actorRole,
        actor: actor ? `${actor.firstName} ${actor.lastName}` : "System",
        createdAt: r.createdAt,
      };
    }),
  };
}
