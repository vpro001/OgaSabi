import { describe, expect, it } from "vitest";
import { maskPhone, normalizePhone } from "@/lib/phone";

describe("normalizePhone (Nigeria default)", () => {
  it.each([
    ["0803 123 4567", "+2348031234567"],
    ["08031234567", "+2348031234567"],
    ["+234 803 123 4567", "+2348031234567"],
    ["2348031234567", "+2348031234567"],
    ["002348031234567", "+2348031234567"],
    ["8031234567", "+2348031234567"],
    ["(0803) 123-4567", "+2348031234567"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "abc", "0803123", "01 234 5678", "+2341234567890"])("rejects %j", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });

  it("accepts other countries as E.164", () => {
    expect(normalizePhone("+233201234567")).toBe("+233201234567");
  });
});

describe("maskPhone", () => {
  it("hides the middle digits", () => {
    expect(maskPhone("+2348031234567")).toBe("+234803 ••• 4567");
  });
});
