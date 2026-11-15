import nodemailer, { type Transporter } from "nodemailer";
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

/** Splits `Name <address>` (or a bare address) into the shape Brevo expects. */
export function parseSender(from: string): { name?: string; email: string } {
  const match = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(from);
  if (!match) return { email: from.trim() };
  const name = match[1]!.trim();
  return name ? { name, email: match[2]!.trim() } : { email: match[2]!.trim() };
}

let smtp: Transporter | undefined;

/** One pooled connection per process. Port 465 is TLS from the start; other ports upgrade with STARTTLS. */
function smtpTransport(): Transporter {
  const env = getEnv();
  smtp ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    requireTLS: env.SMTP_PORT !== 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    pool: true,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return smtp;
}

async function brevo(path: string, body: unknown): Promise<SendResult> {
  const res = await fetch(`https://api.brevo.com/v3/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": getEnv().BREVO_API_KEY ?? "",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => ({}))) as {
    messageId?: string | number;
    message?: string;
  };
  if (!res.ok) return { ok: false, error: json.message ?? `Brevo responded ${res.status}` };
  return {
    ok: true,
    providerRef: json.messageId === undefined ? undefined : String(json.messageId),
  };
}

/**
 * False when SMS_PROVIDER=none. Read straight from the environment so pages can call it while
 * rendering; the root layout reads request headers, so every page renders per request.
 */
export function smsEnabled(): boolean {
  return process.env.SMS_PROVIDER !== "none";
}

export async function sendSms(to: string, text: string): Promise<SendResult> {
  const env = getEnv();
  if (env.SMS_PROVIDER === "none") return { ok: false, error: "SMS is not configured" };
  if (env.SMS_PROVIDER === "mock") {
    record(to, text);
    logger.info({ to: maskPhone(to), sms: text }, "[mock-sms] message not sent to a real phone");
    return { ok: true, providerRef: "mock" };
  }
  if (env.SMS_PROVIDER === "brevo") {
    try {
      return await brevo("transactionalSMS/send", {
        sender: env.BREVO_SMS_SENDER,
        recipient: to.replace(/^\+/, ""),
        content: text,
        type: "transactional",
      });
    } catch (err) {
      logger.warn({ err, to: maskPhone(to) }, "sms send failed");
      return { ok: false, error: err instanceof Error ? err.message : "send failed" };
    }
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
  if (env.EMAIL_PROVIDER === "smtp") {
    try {
      const info = await smtpTransport().sendMail({ from: env.EMAIL_FROM, to, subject, text });
      return { ok: true, providerRef: info.messageId };
    } catch (err) {
      logger.warn({ err }, "email send failed");
      return { ok: false, error: err instanceof Error ? err.message : "send failed" };
    }
  }
  if (env.EMAIL_PROVIDER === "brevo") {
    try {
      return await brevo("smtp/email", {
        sender: parseSender(env.EMAIL_FROM),
        to: [{ email: to }],
        subject,
        textContent: text,
      });
    } catch (err) {
      logger.warn({ err }, "email send failed");
      return { ok: false, error: err instanceof Error ? err.message : "send failed" };
    }
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
