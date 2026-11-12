import { describe, expect, it } from "vitest";
import { computeTrust, tierFor, type TrustInputs } from "@/server/trust/formula";

const base: TrustInputs = {
  verificationLevel: "NONE",
  completedJobs: 0,
  artisanCancellations: 0,
  expiredRequests: 0,
  reviews: [],
  medianResponseSec: null,
  repeatCustomerJobs: 0,
  daysSinceLastCompletedJob: null,
  upheldComplaints: [],
  lostDisputes: [],
};
const stars = (n: number, rating: number) =>
  Array.from({ length: n }, () => ({ rating, weight: 1 }));

describe("computeTrust", () => {
  it("gives a brand-new artisan a modest, provisional score", () => {
    const r = computeTrust(base);
    expect(r.isProvisional).toBe(true);
    expect(r.tier).toBe("NEW");
    expect(r.score).toBeGreaterThan(15);
    expect(r.score).toBeLessThan(40);
    expect(r.ratingAverage).toBeNull();
  });

  it("stays within 0..100 and reaches the top tier for an excellent record", () => {
    const r = computeTrust({
      ...base,
      verificationLevel: "ADMIN_REVIEWED",
      completedJobs: 200,
      reviews: stars(150, 5),
      medianResponseSec: 120,
      repeatCustomerJobs: 80,
      daysSinceLastCompletedJob: 2,
    });
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(95);
    expect(r.tier).toBe("TOP_RATED");
  });

  it("does not let one 5-star review buy a high rating component", () => {
    const one = computeTrust({ ...base, reviews: stars(1, 5) });
    const many = computeTrust({ ...base, reviews: stars(40, 5) });
    expect(one.components.ratings).toBeLessThan(many.components.ratings - 5);
  });

  it("counts discounted reviews for less", () => {
    const full = computeTrust({ ...base, reviews: stars(10, 5) });
    const half = computeTrust({
      ...base,
      reviews: stars(10, 5).map((r) => ({ ...r, weight: 0.5 })),
    });
    expect(half.components.ratings).toBeLessThan(full.components.ratings);
  });

  it("penalises cancellations and unanswered requests", () => {
    const clean = computeTrust({ ...base, completedJobs: 20 });
    const flaky = computeTrust({
      ...base,
      completedJobs: 20,
      artisanCancellations: 6,
      expiredRequests: 6,
    });
    expect(flaky.components.reliability).toBeLessThan(clean.components.reliability);
    expect(flaky.completionRate).toBeCloseTo(20 / 32, 2);
  });

  it("takes points off for upheld complaints, less as they age", () => {
    const good = { ...base, completedJobs: 30, reviews: stars(20, 5) };
    const fresh = computeTrust({
      ...good,
      upheldComplaints: [{ severity: "CRITICAL", ageDays: 0 }],
    });
    const old = computeTrust({
      ...good,
      upheldComplaints: [{ severity: "CRITICAL", ageDays: 360 }],
    });
    expect(fresh.components.penalties).toBe(15);
    expect(old.components.penalties).toBeCloseTo(3.8, 1);
    expect(computeTrust(good).score - fresh.score).toBeCloseTo(15, 1);
  });

  it("never goes below zero", () => {
    const r = computeTrust({
      ...base,
      upheldComplaints: Array.from({ length: 10 }, () => ({
        severity: "CRITICAL" as const,
        ageDays: 0,
      })),
    });
    expect(r.score).toBe(0);
  });
});

describe("tierFor", () => {
  it("keeps artisans with little history in NEW whatever the score", () => {
    expect(tierFor(99, 2)).toBe("NEW");
  });
  it("needs both a high score and 20 jobs for TOP_RATED", () => {
    expect(tierFor(90, 10)).toBe("HIGHLY_TRUSTED");
    expect(tierFor(90, 20)).toBe("TOP_RATED");
    expect(tierFor(55, 20)).toBe("TRUSTED");
    expect(tierFor(40, 20)).toBe("NEW");
  });
});
