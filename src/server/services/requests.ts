import { type z } from "zod";
import { db } from "@/server/db/client";
import { getEnv } from "@/env";
import { Errors } from "@/server/http/errors";
import { type SessionUser } from "@/server/auth/session";
import { sha256 } from "@/server/auth/tokens";
import { isValidKey, keyOwner, publicUrl } from "@/server/providers/storage";
import {
  createNotifications,
  deliverNotifications,
  type NotifyInput,
} from "@/server/services/notifications";
import { recomputeTrustSoon } from "@/server/trust/engine";
import { coarseKm, haversineKm } from "@/lib/geo";
import { formatMoney } from "@/lib/locale";
import {
  type complaintSchema,
  type createRequestSchema,
  type disputeSchema,
  type RequestAction,
  type reviewSchema,
} from "@/lib/schemas";
import {
  type ActorType,
  type ComplaintCategory,
  type ComplaintSeverity,
  type NotificationType,
  Prisma,
  type RequestEventType,
  type RequestStatus,
  type TrustTrigger,
} from "@/generated/prisma/client";

const OPEN: RequestStatus[] = [
  "PENDING",
  "QUOTED",
  "ACCEPTED",
  "EN_ROUTE",
  "IN_PROGRESS",
  "AWAITING_CONFIRMATION",
  "DISPUTED",
];
const ACTIVE_JOB: RequestStatus[] = [
  "ACCEPTED",
  "EN_ROUTE",
  "IN_PROGRESS",
  "AWAITING_CONFIRMATION",
  "DISPUTED",
];
const QUOTE_VALID_HOURS = 48;
const DISPUTE_WINDOW_HOURS = 48;
const REVIEW_WINDOW_DAYS = 30;
export const AUTO_CONFIRM_HOURS = 72;

type Role = "CUSTOMER" | "ARTISAN";

type Transition = {
  role: Role | "BOTH";
  from: RequestStatus[] | Partial<Record<Role, RequestStatus[]>>;
  to: RequestStatus;
  event: RequestEventType;
};

/** The request lifecycle (ADR-010). Anything not listed here is not a legal move. */
export const TRANSITIONS: Record<RequestAction["action"], Transition> = {
  accept: { role: "ARTISAN", from: ["PENDING"], to: "ACCEPTED", event: "ACCEPTED" },
  decline: { role: "ARTISAN", from: ["PENDING", "QUOTED"], to: "DECLINED", event: "DECLINED" },
  quote: { role: "ARTISAN", from: ["PENDING", "QUOTED"], to: "QUOTED", event: "QUOTED" },
  accept_quote: { role: "CUSTOMER", from: ["QUOTED"], to: "ACCEPTED", event: "QUOTE_ACCEPTED" },
  reject_quote: { role: "CUSTOMER", from: ["QUOTED"], to: "PENDING", event: "QUOTE_REJECTED" },
  en_route: { role: "ARTISAN", from: ["ACCEPTED"], to: "EN_ROUTE", event: "EN_ROUTE" },
  start: { role: "ARTISAN", from: ["ACCEPTED", "EN_ROUTE"], to: "IN_PROGRESS", event: "STARTED" },
  mark_complete: {
    role: "ARTISAN",
    from: ["IN_PROGRESS"],
    to: "AWAITING_CONFIRMATION",
    event: "MARKED_COMPLETE",
  },
  confirm: {
    role: "CUSTOMER",
    from: ["AWAITING_CONFIRMATION"],
    to: "COMPLETED",
    event: "CONFIRMED_COMPLETE",
  },
  cancel: {
    role: "BOTH",
    from: {
      CUSTOMER: ["PENDING", "QUOTED", "ACCEPTED", "EN_ROUTE"],
      ARTISAN: ["ACCEPTED", "EN_ROUTE"],
    },
    to: "CANCELLED",
    event: "CANCELLED",
  },
};

export function allowedActions(role: Role, status: RequestStatus): RequestAction["action"][] {
  return (Object.keys(TRANSITIONS) as RequestAction["action"][]).filter((action) => {
    const t = TRANSITIONS[action];
    if (t.role !== "BOTH" && t.role !== role) return false;
    const from = Array.isArray(t.from) ? t.from : (t.from[role] ?? []);
    return from.includes(status);
  });
}

const requestInclude = {
  category: { select: { id: true, name: true, slug: true } },
  customer: { select: { id: true, firstName: true, lastName: true, phone: true, avatarKey: true } },
  artisan: {
    select: {
      id: true,
      userId: true,
      businessName: true,
      trustScore: true,
      trustTier: true,
      whatsappNumber: true,
      lat: true,
      lng: true,
      user: { select: { firstName: true, lastName: true, phone: true, avatarKey: true } },
    },
  },
} satisfies Prisma.ServiceRequestInclude;

type RequestRow = Prisma.ServiceRequestGetPayload<{ include: typeof requestInclude }>;

function roleOf(
  user: SessionUser,
  r: { customerId: string; artisan: { userId: string } },
): Role | "ADMIN" | null {
  if (r.customerId === user.id) return "CUSTOMER";
  if (r.artisan.userId === user.id) return "ARTISAN";
  if (user.roles.includes("ADMIN")) return "ADMIN";
  return null;
}

/** Shapes a request for one viewer, applying the address/contact privacy rule (ADR-007). */
function toSummary(r: RequestRow, role: Role | "ADMIN") {
  const released = r.acceptedAt != null || role !== "ARTISAN";
  const contactsReleased = r.acceptedAt != null || role === "ADMIN";
  const km =
    r.artisan.lat != null && r.artisan.lng != null
      ? haversineKm(r.artisan.lat, r.artisan.lng, r.lat, r.lng)
      : null;
  return {
    id: r.id,
    reference: `OGS-${r.id.replace(/-/g, "").slice(-6).toUpperCase()}`,
    status: r.status,
    role,
    description: r.description,
    category: r.category,
    areaLabel: r.areaLabel,
    city: r.city,
    state: r.state,
    addressLine: released ? r.addressLine : null,
    landmark: released ? r.landmark : null,
    lat: released ? r.lat : Math.round(r.lat * 100) / 100,
    lng: released ? r.lng : Math.round(r.lng * 100) / 100,
    distanceKm: km == null ? null : released ? Math.round(km * 10) / 10 : coarseKm(km),
    addressReleased: released,
    isImmediate: r.isImmediate,
    scheduledFor: r.scheduledFor,
    currency: r.currency,
    quotedAmountKobo: r.quotedAmountKobo,
    finalAmountKobo: r.finalAmountKobo,
    calloutFeeKobo: r.calloutFeeKobo,
    expiresAt: r.status === "PENDING" ? r.expiresAt : null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    acceptedAt: r.acceptedAt,
    startedAt: r.startedAt,
    markedCompleteAt: r.markedCompleteAt,
    completedAt: r.completedAt,
    cancelledAt: r.cancelledAt,
    cancelledByRole: r.cancelledByRole,
    cancellationReason: r.cancellationReason,
    declineReason: r.declineReason,
    customer: {
      id: r.customer.id,
      name:
        role === "ARTISAN" && !contactsReleased
          ? `${r.customer.firstName} ${r.customer.lastName.charAt(0)}.`
          : `${r.customer.firstName} ${r.customer.lastName}`,
      phone: role !== "CUSTOMER" && contactsReleased ? r.customer.phone : null,
      avatarUrl: r.customer.avatarKey ? publicUrl(r.customer.avatarKey) : null,
    },
    artisan: {
      id: r.artisan.id,
      userId: r.artisan.userId,
      businessName: r.artisan.businessName,
      ownerName: `${r.artisan.user.firstName} ${r.artisan.user.lastName}`,
      avatarUrl: r.artisan.user.avatarKey ? publicUrl(r.artisan.user.avatarKey) : null,
      trustScore: r.artisan.trustScore,
      trustTier: r.artisan.trustTier,
      phone: role !== "ARTISAN" && contactsReleased ? r.artisan.user.phone : null,
      whatsappNumber: role !== "ARTISAN" && contactsReleased ? r.artisan.whatsappNumber : null,
    },
  };
}

// ── Create ─────────────────────────────────────────────────────────────────────────────────

export async function createRequest(
  user: SessionUser,
  input: z.infer<typeof createRequestSchema>,
  idempotencyKey: string | null,
) {
  const env = getEnv();
  const scope = "POST /api/v1/requests";
  const requestHash = sha256(JSON.stringify(input));
  if (idempotencyKey) {
    const seen = await db.idempotencyKey.findFirst({
      where: { scope, userId: user.id, key: idempotencyKey },
    });
    if (seen) {
      if (seen.requestHash !== requestHash)
        throw Errors.validation("This Idempotency-Key was already used with different details.");
      if (seen.responseBody) return seen.responseBody as { id: string };
      throw Errors.conflict("This request is already being processed.", "IN_PROGRESS");
    }
  }

  const artisan = await db.artisanProfile.findFirst({
    where: { id: input.artisanId, deletedAt: null },
    select: {
      id: true,
      userId: true,
      status: true,
      businessName: true,
      lat: true,
      lng: true,
      serviceRadiusKm: true,
      calloutMinKobo: true,
      user: { select: { status: true } },
      categories: { select: { categoryId: true } },
    },
  });
  if (!artisan || artisan.status !== "ACTIVE" || artisan.user.status !== "ACTIVE") {
    throw Errors.conflict("This artisan is not taking requests right now.", "ARTISAN_UNAVAILABLE");
  }
  if (artisan.userId === user.id)
    throw Errors.badRequest("You cannot send a request to your own profile.");
  if (!artisan.categories.some((c) => c.categoryId === input.categoryId)) {
    throw Errors.validation("categoryId: This artisan does not offer that kind of work", {
      fields: { categoryId: "This artisan does not offer that kind of work" },
    });
  }
  if (artisan.lat != null && artisan.lng != null) {
    const km = haversineKm(artisan.lat, artisan.lng, input.lat, input.lng);
    if (km > artisan.serviceRadiusKm + 1) {
      throw Errors.conflict(
        `That address is about ${Math.round(km)} km from this artisan, outside the ${artisan.serviceRadiusKm} km area they cover.`,
        "OUTSIDE_SERVICE_AREA",
      );
    }
  }
  const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
  if (!input.isImmediate && scheduledFor) {
    if (scheduledFor.getTime() < Date.now() + 30 * 60_000) {
      throw Errors.validation("scheduledFor: Choose a time at least 30 minutes from now", {
        fields: { scheduledFor: "Choose a time at least 30 minutes from now" },
      });
    }
    if (scheduledFor.getTime() > Date.now() + 60 * 86_400_000) {
      throw Errors.validation("scheduledFor: Choose a time within the next 60 days", {
        fields: { scheduledFor: "Choose a time within the next 60 days" },
      });
    }
  }
  for (const key of input.photoKeys) {
    if (!isValidKey(key) || keyOwner(key) !== user.id || !key.startsWith("pub/request/")) {
      throw Errors.badRequest("One of the photos could not be used. Upload it again.");
    }
  }
  const duplicate = await db.serviceRequest.findFirst({
    where: { customerId: user.id, artisanId: artisan.id, status: { in: OPEN } },
    select: { id: true },
  });
  if (duplicate) {
    throw Errors.conflict(
      "You already have an open request with this artisan.",
      "DUPLICATE_REQUEST",
    );
  }

  const expiresAt = new Date(Date.now() + env.REQUEST_EXPIRY_HOURS * 3_600_000);
  const { id, notificationIds } = await db
    .$transaction(async (tx) => {
      if (idempotencyKey) {
        await tx.idempotencyKey.create({
          data: {
            scope,
            userId: user.id,
            key: idempotencyKey,
            requestHash,
            lockedAt: new Date(),
            expiresAt: new Date(Date.now() + 86_400_000),
          },
        });
      }
      const row = await tx.serviceRequest.create({
        data: {
          customerId: user.id,
          artisanId: artisan.id,
          categoryId: input.categoryId,
          description: input.description,
          addressLine: input.addressLine,
          landmark: input.landmark ?? null,
          areaLabel: input.areaLabel,
          city: input.city ?? null,
          state: input.state ?? null,
          lat: input.lat,
          lng: input.lng,
          isImmediate: input.isImmediate,
          scheduledFor: input.isImmediate ? null : scheduledFor,
          calloutFeeKobo: env.PAYMENTS_ENABLED ? artisan.calloutMinKobo : null,
          expiresAt,
          photos: {
            create: input.photoKeys.map((storageKey) => ({
              storageKey,
              url: publicUrl(storageKey),
              uploadedById: user.id,
            })),
          },
          events: {
            create: {
              type: "CREATED",
              toStatus: "PENDING",
              actorId: user.id,
              actorRole: "CUSTOMER",
            },
          },
        },
        select: { id: true },
      });
      if (idempotencyKey) {
        await tx.idempotencyKey.updateMany({
          where: { scope, userId: user.id, key: idempotencyKey },
          data: { responseStatus: 201, responseBody: { id: row.id }, lockedAt: null },
        });
      }
      const ids = await createNotifications(tx, [
        {
          userId: artisan.userId,
          type: "REQUEST_RECEIVED",
          title: "New job request",
          body: `${user.firstName} in ${input.areaLabel} needs help: ${input.description.slice(0, 120)}`,
          href: `/requests/${row.id}`,
        },
      ]);
      return { id: row.id, notificationIds: ids };
    })
    .catch((err) => {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw Errors.conflict("This request is already being processed.", "IN_PROGRESS");
      }
      throw err;
    });
  deliverNotifications(notificationIds);
  return { id };
}

// ── Read ───────────────────────────────────────────────────────────────────────────────────

export type ListFilter = {
  as: Role;
  group: "active" | "past" | "all";
  cursor?: string;
  limit: number;
};

export async function listRequests(user: SessionUser, f: ListFilter) {
  if (f.as === "ARTISAN" && !user.artisanId) return { requests: [], nextCursor: null };
  const statusFilter =
    f.group === "active" ? { in: OPEN } : f.group === "past" ? { notIn: OPEN } : undefined;
  const rows = await db.serviceRequest.findMany({
    where: {
      ...(f.as === "CUSTOMER" ? { customerId: user.id } : { artisanId: user.artisanId as string }),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(f.cursor ? { id: { lt: f.cursor } } : {}),
    },
    include: {
      ...requestInclude,
      review: { select: { rating: true } },
      _count: {
        select: {
          messages: { where: { readAt: null, senderId: { not: user.id }, deletedAt: null } },
        },
      },
    },
    orderBy: { id: "desc" },
    take: f.limit + 1,
  });
  const page = rows.slice(0, f.limit);
  return {
    nextCursor: rows.length > f.limit ? (page[page.length - 1]?.id ?? null) : null,
    requests: page.map((r) => ({
      ...toSummary(r, f.as),
      unreadMessages: r._count.messages,
      reviewRating: r.review?.rating ?? null,
    })),
  };
}

export async function getRequest(user: SessionUser, id: string) {
  const r = await db.serviceRequest.findUnique({
    where: { id },
    include: {
      ...requestInclude,
      photos: { select: { id: true, url: true } },
      quotes: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "asc" } },
      review: true,
      disputes: { orderBy: { createdAt: "desc" }, take: 1 },
      complaints: { where: { filedById: user.id }, orderBy: { createdAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const role = r ? roleOf(user, r) : null;
  if (!r || !role) throw Errors.notFound("Request");

  if (role === "ARTISAN" && !r.events.some((e) => e.type === "VIEWED")) {
    await db.requestEvent.create({
      data: { requestId: r.id, type: "VIEWED", actorId: user.id, actorRole: "ARTISAN" },
    });
  }
  const unread = await db.message.count({
    where: { requestId: id, readAt: null, deletedAt: null, senderId: { not: user.id } },
  });
  const dispute = r.disputes[0] ?? null;
  const now = Date.now();
  const withinDisputeWindow =
    r.status === "IN_PROGRESS" ||
    r.status === "AWAITING_CONFIRMATION" ||
    (r.status === "COMPLETED" &&
      !!r.completedAt &&
      now - r.completedAt.getTime() < DISPUTE_WINDOW_HOURS * 3_600_000);
  const paid = r.payments[0]?.status === "SUCCEEDED";

  return {
    ...toSummary(r, role),
    photos: r.photos,
    quotes: r.quotes.map((q) => ({
      id: q.id,
      amountKobo: q.amountKobo,
      note: q.note,
      status: q.status,
      validUntil: q.validUntil,
      createdAt: q.createdAt,
    })),
    events: r.events
      .filter((e) => e.type !== "VIEWED" || role !== "CUSTOMER")
      .map((e) => ({
        id: e.id,
        type: e.type,
        actorRole: e.actorRole,
        toStatus: e.toStatus,
        createdAt: e.createdAt,
      })),
    review:
      r.review && (r.review.status === "PUBLISHED" || role !== "ARTISAN")
        ? {
            id: r.review.id,
            rating: r.review.rating,
            tags: r.review.tags,
            comment: r.review.comment,
            replyBody: r.review.replyBody,
            repliedAt: r.review.repliedAt,
            createdAt: r.review.createdAt,
          }
        : null,
    dispute: dispute
      ? {
          id: dispute.id,
          status: dispute.status,
          reason: dispute.reason,
          description: dispute.description,
          openedByRole: dispute.openedByRole,
          resolutionNote: dispute.resolutionNote,
          refundAmountKobo: dispute.refundAmountKobo,
          createdAt: dispute.createdAt,
          resolvedAt: dispute.resolvedAt,
        }
      : null,
    complaints: r.complaints.map((c) => ({
      id: c.id,
      category: c.category,
      status: c.status,
      description: c.description,
      resolutionNote: c.resolutionNote,
      createdAt: c.createdAt,
    })),
    allowedActions: role === "ADMIN" ? [] : allowedActions(role, r.status),
    canMessage: role !== "ADMIN" && OPEN.includes(r.status),
    canReview:
      role === "CUSTOMER" &&
      r.status === "COMPLETED" &&
      !r.review &&
      !!r.completedAt &&
      now - r.completedAt.getTime() < REVIEW_WINDOW_DAYS * 86_400_000,
    canReplyToReview:
      role === "ARTISAN" && !!r.review && !r.review.replyBody && r.review.status === "PUBLISHED",
    canDispute:
      role !== "ADMIN" &&
      withinDisputeWindow &&
      (!dispute || !["OPEN", "UNDER_REVIEW"].includes(dispute.status)),
    canComplain:
      role !== "ADMIN" &&
      r.acceptedAt != null &&
      !r.complaints.some((c) => c.status === "OPEN" || c.status === "UNDER_REVIEW"),
    unreadMessages: unread,
    payment: {
      enabled: getEnv().PAYMENTS_ENABLED,
      depositDue:
        getEnv().PAYMENTS_ENABLED &&
        role === "CUSTOMER" &&
        !!r.calloutFeeKobo &&
        !paid &&
        ACTIVE_JOB.includes(r.status) &&
        r.status !== "DISPUTED",
      depositPaid: paid,
    },
  };
}

// ── Transitions ────────────────────────────────────────────────────────────────────────────

type Notice = { to: Role; type: NotificationType; title: string; body: string };

function noticeFor(action: RequestAction, r: RequestRow, actor: Role): Notice {
  const artisan = r.artisan.businessName;
  const customer = r.customer.firstName;
  switch (action.action) {
    case "accept":
      return {
        to: "CUSTOMER",
        type: "REQUEST_ACCEPTED",
        title: `${artisan} accepted your request`,
        body: "Their phone number is now visible so you can coordinate.",
      };
    case "decline":
      return {
        to: "CUSTOMER",
        type: "REQUEST_DECLINED",
        title: `${artisan} cannot take this job`,
        body: `Reason: ${action.reason}. You can send the request to another artisan.`,
      };
    case "quote":
      return {
        to: "CUSTOMER",
        type: "QUOTE_RECEIVED",
        title: `${artisan} sent a quote of ${formatMoney(action.amountKobo)}`,
        body: action.note ?? "Review the quote and accept or reject it.",
      };
    case "accept_quote":
      return {
        to: "ARTISAN",
        type: "QUOTE_ACCEPTED",
        title: `${customer} accepted your quote`,
        body: "The address and phone number are now visible. The job is booked.",
      };
    case "reject_quote":
      return {
        to: "ARTISAN",
        type: "QUOTE_REJECTED",
        title: `${customer} rejected your quote`,
        body: action.reason ?? "You can send a new quote or decline the request.",
      };
    case "en_route":
      return {
        to: "CUSTOMER",
        type: "ARTISAN_EN_ROUTE",
        title: `${artisan} is on the way`,
        body: "Keep your phone close in case they need directions.",
      };
    case "start":
      return {
        to: "CUSTOMER",
        type: "JOB_STARTED",
        title: `${artisan} has started the job`,
        body: "You will be asked to confirm when the work is finished.",
      };
    case "mark_complete":
      return {
        to: "CUSTOMER",
        type: "JOB_MARKED_COMPLETE",
        title: `${artisan} marked the job as complete`,
        body: "Check the work, then confirm completion or report a problem.",
      };
    case "confirm":
      return {
        to: "ARTISAN",
        type: "JOB_CONFIRMED",
        title: `${customer} confirmed the job is complete`,
        body: "Well done. This job now counts towards your trust score.",
      };
    case "cancel":
      return actor === "CUSTOMER"
        ? {
            to: "ARTISAN",
            type: "REQUEST_CANCELLED",
            title: `${customer} cancelled the request`,
            body: `Reason: ${action.reason}`,
          }
        : {
            to: "CUSTOMER",
            type: "REQUEST_CANCELLED",
            title: `${artisan} cancelled the job`,
            body: `Reason: ${action.reason}. You can send the request to another artisan.`,
          };
  }
}

export async function performAction(user: SessionUser, id: string, action: RequestAction) {
  const r = await db.serviceRequest.findUnique({ where: { id }, include: requestInclude });
  const role = r ? roleOf(user, r) : null;
  if (!r || !role) throw Errors.notFound("Request");
  if (role === "ADMIN") throw Errors.forbidden("Only the customer or the artisan can do that.");
  const t = TRANSITIONS[action.action];
  if (!allowedActions(role, r.status).includes(action.action)) {
    throw Errors.conflict(
      t.role !== "BOTH" && t.role !== role
        ? "Only the other party can do that."
        : "The request has moved on since you opened it. Refresh to see its current state.",
      "INVALID_TRANSITION",
    );
  }
  const env = getEnv();
  const now = new Date();
  const data: Prisma.ServiceRequestUncheckedUpdateManyInput = {
    status: t.to,
    version: { increment: 1 },
  };
  if (role === "ARTISAN" && !r.firstResponseAt) data.firstResponseAt = now;
  let trustTrigger: TrustTrigger | null = null;

  switch (action.action) {
    case "accept":
    case "accept_quote":
      data.acceptedAt = now;
      data.expiresAt = null;
      break;
    case "decline":
      data.declineReason = action.reason;
      data.expiresAt = null;
      break;
    case "quote":
      data.quotedAmountKobo = action.amountKobo;
      data.expiresAt = null;
      break;
    case "reject_quote":
      data.quotedAmountKobo = null;
      data.expiresAt = new Date(now.getTime() + env.REQUEST_EXPIRY_HOURS * 3_600_000);
      break;
    case "start":
      data.startedAt = now;
      break;
    case "mark_complete":
      data.markedCompleteAt = now;
      data.finalAmountKobo = action.finalAmountKobo ?? r.quotedAmountKobo ?? null;
      break;
    case "confirm":
      data.completedAt = now;
      trustTrigger = "JOB_COMPLETED";
      break;
    case "cancel":
      data.cancelledAt = now;
      data.cancelledById = user.id;
      data.cancelledByRole = role;
      data.cancellationReason = action.reason;
      data.expiresAt = null;
      if (role === "ARTISAN") trustTrigger = "JOB_CANCELLED";
      break;
  }

  const notice = noticeFor(action, r, role);
  const notificationIds = await db.$transaction(async (tx) => {
    // Optimistic lock: the write only lands if nobody else moved the request first.
    const updated = await tx.serviceRequest.updateMany({
      where: { id, version: r.version, status: r.status },
      data,
    });
    if (updated.count !== 1) {
      throw Errors.conflict(
        "The request has moved on since you opened it. Refresh to see its current state.",
        "INVALID_TRANSITION",
      );
    }
    if (action.action === "quote") {
      await tx.quote.updateMany({
        where: { requestId: id, status: "PENDING" },
        data: { status: "SUPERSEDED", respondedAt: now },
      });
      await tx.quote.create({
        data: {
          requestId: id,
          artisanId: r.artisanId,
          amountKobo: action.amountKobo,
          note: action.note ?? null,
          validUntil: new Date(now.getTime() + QUOTE_VALID_HOURS * 3_600_000),
        },
      });
    } else if (action.action === "accept_quote" || action.action === "reject_quote") {
      await tx.quote.updateMany({
        where: { requestId: id, status: "PENDING" },
        data: {
          status: action.action === "accept_quote" ? "ACCEPTED" : "REJECTED",
          respondedAt: now,
        },
      });
    } else if (
      r.status === "QUOTED" &&
      (action.action === "decline" || action.action === "cancel")
    ) {
      await tx.quote.updateMany({
        where: { requestId: id, status: "PENDING" },
        data: { status: "EXPIRED", respondedAt: now },
      });
    }
    const metadata: Record<string, unknown> = {};
    if ("reason" in action && action.reason) metadata.reason = action.reason;
    if (action.action === "quote") metadata.amountKobo = action.amountKobo;
    if (action.action === "mark_complete") metadata.finalAmountKobo = data.finalAmountKobo;
    await tx.requestEvent.create({
      data: {
        requestId: id,
        type: t.event,
        fromStatus: r.status,
        toStatus: t.to,
        actorId: user.id,
        actorRole: role,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
    return createNotifications(tx, [
      {
        userId: notice.to === "CUSTOMER" ? r.customerId : r.artisan.userId,
        type: notice.type,
        title: notice.title,
        body: notice.body,
        href: `/requests/${id}`,
      },
    ]);
  });
  deliverNotifications(notificationIds);
  if (trustTrigger) recomputeTrustSoon(r.artisanId, trustTrigger);
  return getRequest(user, id);
}

// ── Messages ───────────────────────────────────────────────────────────────────────────────

async function requireParty(user: SessionUser, id: string) {
  const r = await db.serviceRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      customerId: true,
      artisanId: true,
      acceptedAt: true,
      completedAt: true,
      artisan: { select: { userId: true, businessName: true } },
      customer: { select: { firstName: true } },
    },
  });
  const role = r ? roleOf(user, r) : null;
  if (!r || !role) throw Errors.notFound("Request");
  return { r, role };
}

export async function listMessages(user: SessionUser, id: string, after?: string) {
  const { role } = await requireParty(user, id);
  const rows = await db.message.findMany({
    where: { requestId: id, deletedAt: null, ...(after ? { id: { gt: after } } : {}) },
    orderBy: { id: "asc" },
    take: 200,
    select: { id: true, senderId: true, kind: true, body: true, createdAt: true, readAt: true },
  });
  if (role !== "ADMIN") {
    await db.message.updateMany({
      where: { requestId: id, readAt: null, senderId: { not: user.id } },
      data: { readAt: new Date() },
    });
  }
  return rows.map((m) => ({
    id: m.id,
    mine: m.senderId === user.id,
    kind: m.kind,
    body: m.body,
    createdAt: m.createdAt,
    read: !!m.readAt,
  }));
}

export async function sendMessage(user: SessionUser, id: string, body: string) {
  const { r, role } = await requireParty(user, id);
  if (role === "ADMIN")
    throw Errors.forbidden("Only the customer or the artisan can send messages here.");
  if (!OPEN.includes(r.status))
    throw Errors.conflict("This conversation is closed.", "CONVERSATION_CLOSED");
  const recipient = role === "CUSTOMER" ? r.artisan.userId : r.customerId;
  const senderName = role === "CUSTOMER" ? r.customer.firstName : r.artisan.businessName;
  const { message, ids } = await db.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: { requestId: id, senderId: user.id, body },
      select: { id: true, body: true, createdAt: true, kind: true },
    });
    // One unread "new message" notification per conversation is enough.
    const existing = await tx.notification.findFirst({
      where: {
        userId: recipient,
        type: "NEW_MESSAGE",
        readAt: null,
        data: { path: ["requestId"], equals: id },
      },
      select: { id: true },
    });
    const ids = existing
      ? []
      : await createNotifications(tx, [
          {
            userId: recipient,
            type: "NEW_MESSAGE",
            title: `New message from ${senderName}`,
            body: body.slice(0, 140),
            href: `/requests/${id}`,
            data: { requestId: id },
          },
        ]);
    return { message, ids };
  });
  deliverNotifications(ids);
  return { ...message, mine: true, read: false };
}

// ── Reviews, complaints, disputes ──────────────────────────────────────────────────────────

export async function createReview(
  user: SessionUser,
  id: string,
  input: z.infer<typeof reviewSchema>,
) {
  const r = await db.serviceRequest.findUnique({
    where: { id },
    select: {
      customerId: true,
      artisanId: true,
      status: true,
      completedAt: true,
      review: { select: { id: true } },
      artisan: { select: { userId: true } },
    },
  });
  if (!r || r.customerId !== user.id) throw Errors.notFound("Request");
  if (r.status !== "COMPLETED" || !r.completedAt)
    throw Errors.conflict("You can review a job once it is completed.");
  if (r.review) throw Errors.conflict("You have already reviewed this job.", "ALREADY_REVIEWED");
  if (Date.now() - r.completedAt.getTime() > REVIEW_WINDOW_DAYS * 86_400_000) {
    throw Errors.conflict(`Reviews close ${REVIEW_WINDOW_DAYS} days after a job is completed.`);
  }
  // Many reviews from one customer for one artisan in a short time count for less.
  const recent = await db.review.count({
    where: {
      authorId: user.id,
      artisanId: r.artisanId,
      createdAt: { gt: new Date(Date.now() - 90 * 86_400_000) },
    },
  });
  const ids = await db
    .$transaction(async (tx) => {
      await tx.review.create({
        data: {
          requestId: id,
          authorId: user.id,
          artisanId: r.artisanId,
          rating: input.rating,
          tags: input.tags,
          comment: input.comment ?? null,
          trustWeight: recent >= 3 ? 0.5 : 1,
        },
      });
      await tx.requestEvent.create({
        data: {
          requestId: id,
          type: "REVIEW_POSTED",
          actorId: user.id,
          actorRole: "CUSTOMER",
          metadata: { rating: input.rating },
        },
      });
      return createNotifications(tx, [
        {
          userId: r.artisan.userId,
          type: "REVIEW_RECEIVED",
          title: `You received a ${input.rating}-star review`,
          body: input.comment?.slice(0, 140) ?? "Open the job to read it and reply.",
          href: `/requests/${id}`,
        },
      ]);
    })
    .catch((err) => {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
        throw Errors.conflict("You have already reviewed this job.", "ALREADY_REVIEWED");
      throw err;
    });
  deliverNotifications(ids);
  recomputeTrustSoon(r.artisanId, "REVIEW");
}

export async function replyToReview(user: SessionUser, reviewId: string, body: string) {
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      replyBody: true,
      authorId: true,
      requestId: true,
      status: true,
      artisan: { select: { userId: true, businessName: true } },
    },
  });
  if (!review || review.artisan.userId !== user.id || review.status !== "PUBLISHED")
    throw Errors.notFound("Review");
  if (review.replyBody) throw Errors.conflict("You have already replied to this review.");
  const ids = await db.$transaction(async (tx) => {
    await tx.review.update({
      where: { id: reviewId },
      data: { replyBody: body, repliedAt: new Date() },
    });
    return createNotifications(tx, [
      {
        userId: review.authorId,
        type: "REVIEW_REPLIED",
        title: `${review.artisan.businessName} replied to your review`,
        body: body.slice(0, 140),
        href: `/requests/${review.requestId}`,
      },
    ]);
  });
  deliverNotifications(ids);
}

const SEVERITY: Record<ComplaintCategory, ComplaintSeverity> = {
  LATE_ARRIVAL: "LOW",
  RUDE_BEHAVIOUR: "MEDIUM",
  OVERCHARGING: "MEDIUM",
  POOR_WORKMANSHIP: "MEDIUM",
  NO_SHOW: "MEDIUM",
  NON_PAYMENT: "MEDIUM",
  OTHER: "LOW",
  ABANDONED_JOB: "HIGH",
  PROPERTY_DAMAGE: "HIGH",
  UNSAFE_WORK: "CRITICAL",
  FRAUD: "CRITICAL",
};

function assertEvidence(keys: string[], userId: string) {
  for (const key of keys) {
    if (!isValidKey(key) || keyOwner(key) !== userId || !key.startsWith("priv/evidence/")) {
      throw Errors.badRequest("One of the attachments could not be used. Upload it again.");
    }
  }
}

async function notifyAdmins(tx: Prisma.TransactionClient, n: Omit<NotifyInput, "userId">) {
  const admins = await tx.user.findMany({
    where: { roles: { has: "ADMIN" }, status: "ACTIVE" },
    select: { id: true },
  });
  return createNotifications(
    tx,
    admins.map((a) => ({ ...n, userId: a.id })),
  );
}

export async function fileComplaint(
  user: SessionUser,
  id: string,
  input: z.infer<typeof complaintSchema>,
) {
  const { r, role } = await requireParty(user, id);
  if (role === "ADMIN") throw Errors.forbidden();
  if (!r.acceptedAt)
    throw Errors.conflict("You can file a complaint once a job has been accepted.");
  assertEvidence(input.evidenceKeys, user.id);
  const open = await db.complaint.count({
    where: { requestId: id, filedById: user.id, status: { in: ["OPEN", "UNDER_REVIEW"] } },
  });
  if (open > 0)
    throw Errors.conflict("You already have an open complaint on this job.", "COMPLAINT_OPEN");
  const ids = await db.$transaction(async (tx) => {
    const c = await tx.complaint.create({
      data: {
        requestId: id,
        filedById: user.id,
        filedByRole: role,
        againstUserId: role === "CUSTOMER" ? r.artisan.userId : r.customerId,
        category: input.category,
        severity: SEVERITY[input.category],
        description: input.description,
        evidence: {
          create: input.evidenceKeys.map((storageKey) => ({
            storageKey,
            uploadedById: user.id,
            mimeType: storageKey.endsWith(".pdf") ? "application/pdf" : "image/*",
            sizeBytes: 0,
          })),
        },
      },
    });
    return notifyAdmins(tx, {
      type: "COMPLAINT_UPDATE",
      title: "New complaint to review",
      body: `${input.category.replace(/_/g, " ").toLowerCase()} — ${input.description.slice(0, 100)}`,
      href: "/admin/complaints",
      data: { complaintId: c.id },
    });
  });
  deliverNotifications(ids);
}

export async function openDispute(
  user: SessionUser,
  id: string,
  input: z.infer<typeof disputeSchema>,
) {
  const r = await db.serviceRequest.findUnique({ where: { id }, include: requestInclude });
  const role = r ? roleOf(user, r) : null;
  if (!r || !role) throw Errors.notFound("Request");
  if (role === "ADMIN") throw Errors.forbidden();
  const inWindow =
    r.status === "IN_PROGRESS" ||
    r.status === "AWAITING_CONFIRMATION" ||
    (r.status === "COMPLETED" &&
      !!r.completedAt &&
      Date.now() - r.completedAt.getTime() < DISPUTE_WINDOW_HOURS * 3_600_000);
  if (!inWindow) {
    throw Errors.conflict(
      `A dispute can be opened while a job is in progress or within ${DISPUTE_WINDOW_HOURS} hours of completion.`,
      "DISPUTE_WINDOW_CLOSED",
    );
  }
  assertEvidence(input.evidenceKeys, user.id);
  const other = role === "CUSTOMER" ? r.artisan.userId : r.customerId;
  const ids = await db
    .$transaction(async (tx) => {
      const updated = await tx.serviceRequest.updateMany({
        where: { id, version: r.version, status: r.status },
        data: { status: "DISPUTED", version: { increment: 1 } },
      });
      if (updated.count !== 1)
        throw Errors.conflict(
          "The request has moved on since you opened it. Refresh and try again.",
          "INVALID_TRANSITION",
        );
      const d = await tx.dispute.create({
        data: {
          requestId: id,
          openedById: user.id,
          openedByRole: role,
          reason: input.reason,
          description: input.description,
          evidence: {
            create: input.evidenceKeys.map((storageKey) => ({
              storageKey,
              uploadedById: user.id,
              mimeType: storageKey.endsWith(".pdf") ? "application/pdf" : "image/*",
              sizeBytes: 0,
            })),
          },
        },
      });
      await tx.requestEvent.create({
        data: {
          requestId: id,
          type: "DISPUTE_OPENED",
          fromStatus: r.status,
          toStatus: "DISPUTED",
          actorId: user.id,
          actorRole: role,
          metadata: { disputeId: d.id, reason: input.reason },
        },
      });
      const a = await createNotifications(tx, [
        {
          userId: other,
          type: "DISPUTE_UPDATE",
          title: "A dispute was opened on your job",
          body: `Reason: ${input.reason}. Our team will review it and contact both sides.`,
          href: `/requests/${id}`,
        },
      ]);
      const b = await notifyAdmins(tx, {
        type: "DISPUTE_UPDATE",
        title: "New dispute to review",
        body: `${input.reason} — ${input.description.slice(0, 100)}`,
        href: "/admin/disputes",
      });
      return [...a, ...b];
    })
    .catch((err) => {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
        throw Errors.conflict("This job already has an open dispute.", "DISPUTE_OPEN");
      throw err;
    });
  deliverNotifications(ids);
  return getRequest(user, id);
}

// ── Scheduled maintenance ──────────────────────────────────────────────────────────────────

async function systemMove(
  r: {
    id: string;
    version: number;
    status: RequestStatus;
    customerId: string;
    artisanId: string;
    artisan: { userId: string; businessName: string };
  },
  to: RequestStatus,
  event: RequestEventType,
  extra: Prisma.ServiceRequestUncheckedUpdateManyInput,
  notices: { userId: string; type: NotificationType; title: string; body: string }[],
): Promise<boolean> {
  const ids = await db.$transaction(async (tx) => {
    const updated = await tx.serviceRequest.updateMany({
      where: { id: r.id, version: r.version, status: r.status },
      data: { ...extra, status: to, version: { increment: 1 } },
    });
    if (updated.count !== 1) return null;
    await tx.quote.updateMany({
      where: { requestId: r.id, status: "PENDING" },
      data: { status: "EXPIRED", respondedAt: new Date() },
    });
    await tx.requestEvent.create({
      data: {
        requestId: r.id,
        type: event,
        fromStatus: r.status,
        toStatus: to,
        actorRole: "SYSTEM" satisfies ActorType,
      },
    });
    return createNotifications(
      tx,
      notices.map((n) => ({ ...n, href: `/requests/${r.id}` })),
    );
  });
  if (!ids) return false;
  deliverNotifications(ids);
  return true;
}

/** Expires unanswered requests and stale quotes, and auto-confirms jobs nobody disputed. */
export async function runRequestMaintenance(now = new Date()) {
  const select = {
    id: true,
    version: true,
    status: true,
    customerId: true,
    artisanId: true,
    artisan: { select: { userId: true, businessName: true } },
  } as const;
  const result = { expired: 0, quotesExpired: 0, autoConfirmed: 0 };
  const touched = new Set<string>();

  const pending = await db.serviceRequest.findMany({
    where: { status: "PENDING", expiresAt: { lt: now } },
    select,
    take: 500,
  });
  for (const r of pending) {
    const ok = await systemMove(r, "EXPIRED", "EXPIRED", { expiresAt: null }, [
      {
        userId: r.customerId,
        type: "REQUEST_EXPIRED",
        title: `${r.artisan.businessName} did not respond in time`,
        body: "Your request has expired. You can send it to another artisan.",
      },
      {
        userId: r.artisan.userId,
        type: "REQUEST_EXPIRED",
        title: "A job request expired",
        body: "You did not respond in time. Unanswered requests lower your trust score.",
      },
    ]);
    if (ok) {
      result.expired += 1;
      touched.add(r.artisanId);
    }
  }

  const quoted = await db.serviceRequest.findMany({
    where: { status: "QUOTED", quotes: { some: { status: "PENDING", validUntil: { lt: now } } } },
    select,
    take: 500,
  });
  for (const r of quoted) {
    const ok = await systemMove(r, "EXPIRED", "EXPIRED", {}, [
      {
        userId: r.customerId,
        type: "REQUEST_EXPIRED",
        title: "A quote you received has expired",
        body: "You did not respond to the quote in time, so the request was closed.",
      },
      {
        userId: r.artisan.userId,
        type: "REQUEST_EXPIRED",
        title: "Your quote expired",
        body: "The customer did not respond in time. This does not affect your trust score.",
      },
    ]);
    if (ok) result.quotesExpired += 1;
  }

  const stale = await db.serviceRequest.findMany({
    where: {
      status: "AWAITING_CONFIRMATION",
      markedCompleteAt: { lt: new Date(now.getTime() - AUTO_CONFIRM_HOURS * 3_600_000) },
    },
    select,
    take: 500,
  });
  for (const r of stale) {
    const ok = await systemMove(r, "COMPLETED", "CONFIRMED_COMPLETE", { completedAt: now }, [
      {
        userId: r.customerId,
        type: "JOB_CONFIRMED",
        title: "Your job was marked as completed",
        body: `You did not respond within ${AUTO_CONFIRM_HOURS} hours, so it was confirmed automatically. You can still leave a review.`,
      },
      {
        userId: r.artisan.userId,
        type: "JOB_CONFIRMED",
        title: "Your job was confirmed automatically",
        body: "The customer did not respond, so the job now counts as completed.",
      },
    ]);
    if (ok) {
      result.autoConfirmed += 1;
      touched.add(r.artisanId);
    }
  }
  for (const artisanId of touched) recomputeTrustSoon(artisanId, "NIGHTLY");

  await db.idempotencyKey.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.otpCode.deleteMany({
    where: { expiresAt: { lt: new Date(now.getTime() - 86_400_000) } },
  });
  await db.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date(now.getTime() - 7 * 86_400_000) } },
  });
  return result;
}
