import { createHmac, randomUUID } from "node:crypto";
import { db } from "@/server/db/client";
import { getEnv } from "@/env";
import { Errors } from "@/server/http/errors";
import { logger } from "@/server/logger";
import { safeEqual } from "@/server/auth/tokens";
import { type SessionUser } from "@/server/auth/session";
import { createNotifications, deliverNotifications } from "@/server/services/notifications";
import { type Prisma } from "@/generated/prisma/client";

// Callout deposits through Paystack. Off unless PAYMENTS_ENABLED=true. OgaSabi does not hold
// job payments: the deposit is the only money that moves through the platform.

/** Starts a Paystack checkout for the callout deposit and returns the URL to send the customer to. */
export async function startDeposit(
  user: SessionUser,
  requestId: string,
): Promise<{ authorizationUrl: string }> {
  const env = getEnv();
  if (!env.PAYMENTS_ENABLED) throw Errors.notFound("Payments");
  const r = await db.serviceRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      customerId: true,
      status: true,
      calloutFeeKobo: true,
      currency: true,
      payments: { where: { status: "SUCCEEDED" }, select: { id: true } },
    },
  });
  if (!r || r.customerId !== user.id) throw Errors.notFound("Request");
  if (!r.calloutFeeKobo) throw Errors.conflict("This job has no callout deposit.");
  if (r.payments.length > 0) throw Errors.conflict("The deposit has already been paid.");
  if (!["ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "AWAITING_CONFIRMATION"].includes(r.status)) {
    throw Errors.conflict("The deposit can be paid once the artisan has accepted the job.");
  }
  const reference = `ogs_${randomUUID().replace(/-/g, "")}`;
  const email = user.email ?? `${user.id}@customers.ogasabi.invalid`;
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: r.calloutFeeKobo,
      currency: r.currency,
      reference,
      callback_url: `${env.APP_URL}/requests/${r.id}?paid=1`,
      metadata: { requestId: r.id },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => null)) as {
    status?: boolean;
    data?: { authorization_url?: string };
    message?: string;
  } | null;
  if (!res.ok || !json?.status || !json.data?.authorization_url) {
    logger.error({ status: res.status, message: json?.message }, "paystack initialize failed");
    throw Errors.conflict(
      "We could not start the payment. Please try again in a moment.",
      "PAYMENT_UNAVAILABLE",
    );
  }
  await db.payment.create({
    data: {
      requestId: r.id,
      payerId: user.id,
      provider: "paystack",
      reference,
      amountKobo: r.calloutFeeKobo,
      currency: r.currency,
    },
  });
  return { authorizationUrl: json.data.authorization_url };
}

/** Handles a Paystack webhook. Verifies the signature, dedupes retries, and settles the payment. */
export async function handlePaystackWebhook(
  rawBody: string,
  signature: string | null,
): Promise<void> {
  const env = getEnv();
  if (!env.PAYMENTS_ENABLED || !env.PAYSTACK_SECRET_KEY) throw Errors.notFound("Payments");
  const expected = createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  if (!signature || !safeEqual(expected, signature))
    throw Errors.unauthorized("Invalid signature.");

  const event = JSON.parse(rawBody) as {
    event?: string;
    data?: { id?: number; reference?: string; amount?: number; status?: string };
  };
  const reference = event.data?.reference;
  if (!event.event || !reference) return;
  const eventId = `${event.event}:${event.data?.id ?? reference}`;
  try {
    await db.webhookEvent.create({
      data: {
        provider: "paystack",
        eventId,
        eventType: event.event,
        payload: event as unknown as Prisma.InputJsonValue,
      },
    });
  } catch {
    return; // already processed (Paystack retries)
  }
  if (event.event !== "charge.success") return;

  const payment = await db.payment.findUnique({
    where: { reference },
    include: { request: { select: { id: true, artisan: { select: { userId: true } } } } },
  });
  if (!payment || payment.status === "SUCCEEDED") return;
  if (event.data?.amount !== payment.amountKobo) {
    await db.webhookEvent.updateMany({
      where: { provider: "paystack", eventId },
      data: { error: "amount mismatch" },
    });
    logger.error({ reference }, "paystack amount mismatch");
    return;
  }
  const ids = await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        paidAt: new Date(),
        providerPayload: event.data as unknown as Prisma.InputJsonValue,
      },
    });
    await tx.requestEvent.create({
      data: {
        requestId: payment.requestId,
        type: "PAYMENT_RECEIVED",
        actorId: payment.payerId,
        actorRole: "CUSTOMER",
        metadata: { amountKobo: payment.amountKobo },
      },
    });
    await tx.webhookEvent.updateMany({
      where: { provider: "paystack", eventId },
      data: { processedAt: new Date() },
    });
    return createNotifications(tx, [
      {
        userId: payment.request.artisan.userId,
        type: "ACCOUNT_NOTICE",
        title: "Callout deposit received",
        body: "The customer has paid the callout deposit for this job.",
        href: `/requests/${payment.requestId}`,
      },
    ]);
  });
  deliverNotifications(ids);
}
