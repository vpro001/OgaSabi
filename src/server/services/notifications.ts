import { db } from "@/server/db/client";
import { logger } from "@/server/logger";
import { getEnv } from "@/env";
import { sendEmail, sendSms } from "@/server/providers/messaging";
import {
  type NotificationChannel,
  type NotificationType,
  type Prisma,
} from "@/generated/prisma/client";

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Deep link target inside the app, e.g. `/requests/<id>`. */
  href?: string;
  data?: Record<string, unknown>;
};

// Channels used when the user has not chosen for themselves. In-app is always on.
const DEFAULT_CHANNELS: Partial<Record<NotificationType, NotificationChannel[]>> = {
  REQUEST_RECEIVED: ["SMS", "EMAIL"],
  REQUEST_ACCEPTED: ["EMAIL"],
  QUOTE_RECEIVED: ["EMAIL"],
  QUOTE_ACCEPTED: ["SMS"],
  JOB_MARKED_COMPLETE: ["EMAIL"],
  DISPUTE_UPDATE: ["EMAIL"],
  VERIFICATION_UPDATE: ["EMAIL"],
  ACCOUNT_NOTICE: ["EMAIL"],
};

export const CONFIGURABLE_TYPES: NotificationType[] = [
  "REQUEST_RECEIVED",
  "REQUEST_ACCEPTED",
  "QUOTE_RECEIVED",
  "QUOTE_ACCEPTED",
  "JOB_MARKED_COMPLETE",
  "NEW_MESSAGE",
  "REVIEW_RECEIVED",
  "DISPUTE_UPDATE",
  "VERIFICATION_UPDATE",
];

export function defaultChannels(type: NotificationType): NotificationChannel[] {
  return DEFAULT_CHANNELS[type] ?? [];
}

/** Writes the in-app notification inside the caller's transaction. Returns ids to deliver later. */
export async function createNotifications(
  tx: Prisma.TransactionClient,
  inputs: NotifyInput[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const n of inputs) {
    const row = await tx.notification.create({
      data: {
        userId: n.userId,
        type: n.type,
        title: n.title,
        body: n.body,
        data: { ...(n.data ?? {}), ...(n.href ? { href: n.href } : {}) } as Prisma.InputJsonValue,
        deliveries: {
          create: { channel: "IN_APP", status: "SENT", sentAt: new Date(), attempts: 1 },
        },
      },
      select: { id: true },
    });
    ids.push(row.id);
  }
  return ids;
}

/** Sends SMS/email copies after the transaction has committed. Never throws. */
export function deliverNotifications(ids: string[]): void {
  if (ids.length === 0) return;
  void (async () => {
    for (const id of ids) {
      try {
        await deliverOne(id);
      } catch (err) {
        logger.warn({ err, notificationId: id }, "notification delivery failed");
      }
    }
  })();
}

async function deliverOne(id: string): Promise<void> {
  const n = await db.notification.findUnique({
    where: { id },
    include: { user: { select: { email: true, phone: true, status: true } } },
  });
  if (!n || n.user.status !== "ACTIVE") return;
  const pref = await db.notificationPreference.findUnique({
    where: { userId_type: { userId: n.userId, type: n.type } },
  });
  const channels = (pref?.channels ?? defaultChannels(n.type)).filter(
    (c) => c === "SMS" || c === "EMAIL",
  );
  const href = (n.data as { href?: string } | null)?.href;
  const link = href ? `${getEnv().APP_URL}${href}` : getEnv().APP_URL;

  for (const channel of channels) {
    const target = channel === "SMS" ? n.user.phone : n.user.email;
    if (!target) {
      await db.notificationDelivery.create({
        data: { notificationId: id, channel, status: "SKIPPED", error: "no contact on file" },
      });
      continue;
    }
    const result =
      channel === "SMS"
        ? await sendSms(target, `OgaSabi: ${n.title}. ${link}`)
        : await sendEmail(target, n.title, `${n.body}\n\nOpen OgaSabi: ${link}`);
    await db.notificationDelivery.create({
      data: {
        notificationId: id,
        channel,
        status: result.ok ? "SENT" : "FAILED",
        providerRef: result.providerRef ?? null,
        error: result.error?.slice(0, 300) ?? null,
        attempts: 1,
        sentAt: result.ok ? new Date() : null,
      },
    });
  }
}

/** One-shot helper for code paths that are not already inside a transaction. */
export async function notify(input: NotifyInput): Promise<void> {
  const ids = await db.$transaction((tx) => createNotifications(tx, [input]));
  deliverNotifications(ids);
}

export async function audit(
  tx: Prisma.TransactionClient | typeof db,
  entry: {
    actorId: string | null;
    actorRole: "CUSTOMER" | "ARTISAN" | "ADMIN" | "SYSTEM";
    action: string;
    entityType: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
    ip?: string | null;
    userAgent?: string | null;
    requestId?: string | null;
  },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      before: (entry.before ?? undefined) as Prisma.InputJsonValue | undefined,
      after: (entry.after ?? undefined) as Prisma.InputJsonValue | undefined,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent?.slice(0, 300) ?? null,
      requestId: entry.requestId ?? null,
    },
  });
}
