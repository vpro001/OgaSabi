import { getEnv } from "@/env";
import { logger } from "@/server/logger";
import { maskPhone } from "@/lib/phone";

export type SendResult = { ok: boolean; providerRef?: string; error?: string };

// Mock providers keep the last messages in memory so local development and tests can read
// one-time codes without a real gateway. They refuse to load in production (see src/env.ts).
type Outbox = { to: string; text: string; at: number }[];
const store = globalThis as unknown as { __ogasabiOutbox?: Outbox };
const outbox = (store.__ogasabiOutbox ??= []);

function record(to: string, text: string) {
  outbox.push({ to, text, at: Date.now() });
  if (outbox.length > 200) outbox.shift();
}

/** Development/test only: the most recent mock message sent to `to`. */
export function lastMockMessage(to: string): string | null {
  for (let i = outbox.length - 1; i >= 0; i--) if (outbox[i]?.to === to) return outbox[i]!.text;
  return null;
}

export async function sendSms(to: string, text: string): Promise<SendResult> {
  const env = getEnv();
  if (env.SMS_PROVIDER === "mock") {
    record(to, text);
    logger.info({ to: maskPhone(to), sms: text }, "[mock-sms] message not sent to a real phone");
    return { ok: true, providerRef: "mock" };
  }
  try {
    const res = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: env.TERMII_API_KEY,
        from: env.TERMII_SENDER_ID,
        to: to.replace(/^\+/, ""),
        sms: text,
        type: "plain",
        channel: "generic",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as { message_id?: string; message?: string };
    if (!res.ok) return { ok: false, error: json.message ?? `Termii responded ${res.status}` };
    return { ok: true, providerRef: json.message_id };
  } catch (err) {
    logger.warn({ err, to: maskPhone(to) }, "sms send failed");
    return { ok: false, error: err instanceof Error ? err.message : "send failed" };
  }
}

export async function sendEmail(to: string, subject: string, text: string): Promise<SendResult> {
  const env = getEnv();
  if (env.EMAIL_PROVIDER === "mock") {
    record(to, text);
    logger.info({ to, subject, email: text }, "[mock-email] message not sent to a real inbox");
    return { ok: true, providerRef: "mock" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { ok: false, error: json.message ?? `Resend responded ${res.status}` };
    return { ok: true, providerRef: json.id };
  } catch (err) {
    logger.warn({ err }, "email send failed");
    return { ok: false, error: err instanceof Error ? err.message : "send failed" };
  }
}
