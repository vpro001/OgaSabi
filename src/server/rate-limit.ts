import { Errors } from "@/server/http/errors";

// Fixed-window counters held in process memory. This is correct for a single instance (the
// documented deployment). Behind several instances each one keeps its own counters, so put a
// shared limiter (reverse proxy or Redis) in front; see docs/deployment.md.
type Bucket = { count: number; resetAt: number };
const globalStore = globalThis as unknown as { __ogasabiRate?: Map<string, Bucket> };
const buckets = (globalStore.__ogasabiRate ??= new Map<string, Bucket>());
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

export type RateRule = { name: string; limit: number; windowSec: number };

/** Throws a 429 AppError when `key` has used up `rule` in the current window. */
export function enforceRateLimit(rule: RateRule, key: string, now = Date.now()): void {
  if (process.env.RATE_LIMIT_DISABLED === "1" && process.env.NODE_ENV !== "production") return;
  sweep(now);
  const id = `${rule.name}:${key}`;
  const bucket = buckets.get(id);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + rule.windowSec * 1000 });
    return;
  }
  bucket.count += 1;
  if (bucket.count > rule.limit) throw Errors.tooMany((bucket.resetAt - now) / 1000);
}

export function resetRateLimits(): void {
  buckets.clear();
}

export const Rules = {
  login: { name: "login", limit: 10, windowSec: 15 * 60 },
  register: { name: "register", limit: 5, windowSec: 60 * 60 },
  otp: { name: "otp", limit: 5, windowSec: 15 * 60 },
  passwordReset: { name: "pwreset", limit: 5, windowSec: 60 * 60 },
  write: { name: "write", limit: 60, windowSec: 60 },
  message: { name: "message", limit: 30, windowSec: 60 },
  upload: { name: "upload", limit: 30, windowSec: 10 * 60 },
  search: { name: "search", limit: 120, windowSec: 60 },
  report: { name: "report", limit: 10, windowSec: 60 * 60 },
} satisfies Record<string, RateRule>;
