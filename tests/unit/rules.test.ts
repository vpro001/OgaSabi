import { beforeEach, describe, expect, it } from "vitest";
import { allowedActions } from "@/server/services/requests";
import { enforceRateLimit, resetRateLimits } from "@/server/rate-limit";
import { AppError } from "@/server/http/errors";
import { isValidKey, keyOwner, sniffFile } from "@/server/providers/storage";
import { createRequestSchema, registerSchema } from "@/lib/schemas";
import { safeNext } from "@/lib/forms";
import { coarseKm, haversineKm } from "@/lib/geo";

describe("request lifecycle", () => {
  it("lets only the artisan answer a new request", () => {
    expect(allowedActions("ARTISAN", "PENDING").sort()).toEqual(["accept", "decline", "quote"]);
    expect(allowedActions("CUSTOMER", "PENDING")).toEqual(["cancel"]);
  });
  it("lets only the customer answer a quote", () => {
    expect(allowedActions("CUSTOMER", "QUOTED").sort()).toEqual([
      "accept_quote",
      "cancel",
      "reject_quote",
    ]);
    expect(allowedActions("ARTISAN", "QUOTED").sort()).toEqual(["decline", "quote"]);
  });
  it("lets only the customer confirm completion", () => {
    expect(allowedActions("CUSTOMER", "AWAITING_CONFIRMATION")).toEqual(["confirm"]);
    expect(allowedActions("ARTISAN", "AWAITING_CONFIRMATION")).toEqual([]);
  });
  it("allows nothing once a request is finished", () => {
    for (const status of ["COMPLETED", "DECLINED", "CANCELLED", "EXPIRED", "DISPUTED"] as const) {
      expect(allowedActions("CUSTOMER", status)).toEqual([]);
      expect(allowedActions("ARTISAN", status)).toEqual([]);
    }
  });
  it("does not let anyone cancel once work has started", () => {
    expect(allowedActions("CUSTOMER", "IN_PROGRESS")).toEqual([]);
    expect(allowedActions("ARTISAN", "IN_PROGRESS")).toEqual(["mark_complete"]);
  });
});

describe("rate limiting", () => {
  beforeEach(() => {
    delete process.env.RATE_LIMIT_DISABLED;
    resetRateLimits();
  });
  it("blocks after the limit and recovers in the next window", () => {
    const rule = { name: "t", limit: 2, windowSec: 60 };
    enforceRateLimit(rule, "a", 0);
    enforceRateLimit(rule, "a", 1);
    expect(() => enforceRateLimit(rule, "a", 2)).toThrow(AppError);
    expect(() => enforceRateLimit(rule, "b", 2)).not.toThrow();
    expect(() => enforceRateLimit(rule, "a", 61_000)).not.toThrow();
  });
});

describe("storage keys and file sniffing", () => {
  const owner = "019af430-14d7-7fad-a49b-feaef6102ad9";
  const key = `pub/portfolio/${owner}/019af430-14d7-7fad-a49b-feaef6102ad8.jpg`;
  it("accepts well-formed keys and reads the owner", () => {
    expect(isValidKey(key)).toBe(true);
    expect(keyOwner(key)).toBe(owner);
  });
  it("rejects traversal and unknown shapes", () => {
    expect(isValidKey("pub/../../etc/passwd")).toBe(false);
    expect(isValidKey(`pub/portfolio/${owner}/x.exe`)).toBe(false);
    expect(isValidKey(key.replace("pub", "other"))).toBe(false);
  });
  it("identifies files by content, not by name", () => {
    expect(sniffFile(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe("jpg");
    expect(sniffFile(Buffer.from("%PDF-1.7"))?.ext).toBe("pdf");
    expect(sniffFile(Buffer.from("<script>alert(1)</script>"))).toBeNull();
  });
});

describe("validation", () => {
  it("needs an email or a phone to register", () => {
    const ok = {
      firstName: "Ada",
      lastName: "Obi",
      password: "Passw0rd!",
      acceptTerms: true as const,
    };
    expect(registerSchema.safeParse(ok).success).toBe(false);
    expect(registerSchema.safeParse({ ...ok, phone: "08031234567" }).success).toBe(true);
    expect(
      registerSchema.safeParse({ ...ok, email: "ada@example.com", password: "short" }).success,
    ).toBe(false);
  });
  it("needs a time unless the job is immediate", () => {
    const req = {
      artisanId: "019af430-14d7-7fad-a49b-feaef6102ad9",
      categoryId: "019af430-14d7-7fad-a49b-feaef6102ad8",
      description: "The kitchen tap has been leaking since Monday.",
      addressLine: "12 Aba Road",
      areaLabel: "Rumuola",
      lat: 4.8,
      lng: 7,
      isImmediate: false,
    };
    expect(createRequestSchema.safeParse(req).success).toBe(false);
    expect(createRequestSchema.safeParse({ ...req, isImmediate: true }).success).toBe(true);
  });
  it("only follows same-site redirects after sign-in", () => {
    expect(safeNext("/requests/1")).toBe("/requests/1");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("https://evil.example")).toBe("/");
  });
});

describe("geo", () => {
  it("measures Lagos to Abuja at roughly 520 km", () => {
    expect(haversineKm(6.5244, 3.3792, 9.0765, 7.3986)).toBeGreaterThan(500);
    expect(haversineKm(6.5244, 3.3792, 9.0765, 7.3986)).toBeLessThan(540);
  });
  it("coarsens distances to half kilometres", () => {
    expect(coarseKm(2.26)).toBe(2.5);
    expect(coarseKm(0.1)).toBe(0.5);
  });
});
