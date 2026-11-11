import { type NextRequest } from "next/server";
import { AppError } from "@/server/http/errors";
import { fail, ok } from "@/server/http/response";
import { logger } from "@/server/logger";
import { handlePaystackWebhook } from "@/server/services/payments";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await handlePaystackWebhook(await req.text(), req.headers.get("x-paystack-signature"));
    return ok({ received: true });
  } catch (err) {
    if (err instanceof AppError) return fail(err.code, err.message, err.status);
    logger.error({ err }, "paystack webhook failed");
    return fail("INTERNAL_ERROR", "Webhook processing failed.", 500);
  }
}
