import { describe, expect, it } from "vitest";
import { formatMoney, formatPriceRange, formatRelativeTime, toMinorUnits } from "@/lib/locale";

describe("formatMoney", () => {
  it("formats whole naira without decimals", () => {
    expect(formatMoney(500_000)).toBe("₦5,000");
  });
  it("keeps kobo when present", () => {
    expect(formatMoney(150_050)).toBe("₦1,500.50");
  });
  it("is locale/currency configurable", () => {
    expect(formatMoney(100_000, { currency: "GHS", locale: "en-GH" })).toMatch(/1,000/);
  });
});

describe("formatPriceRange", () => {
  it("renders a range, a single figure, open ends and nothing", () => {
    expect(formatPriceRange(500_000, 1_500_000)).toBe("₦5,000 – ₦15,000");
    expect(formatPriceRange(500_000, 500_000)).toBe("₦5,000");
    expect(formatPriceRange(500_000, null)).toBe("from ₦5,000");
    expect(formatPriceRange(null, 500_000)).toBe("up to ₦5,000");
    expect(formatPriceRange(null, null)).toBeNull();
  });
});

describe("toMinorUnits", () => {
  it("avoids float drift", () => {
    expect(toMinorUnits(19.99)).toBe(1999);
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-10-12T12:00:00Z");
  it("handles past and future", () => {
    expect(formatRelativeTime(new Date("2026-10-12T11:55:00Z"), now, "en")).toBe("5 minutes ago");
    expect(formatRelativeTime(new Date("2026-10-14T12:00:00Z"), now, "en")).toBe("in 2 days");
  });
});
