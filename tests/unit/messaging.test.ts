import { describe, expect, it } from "vitest";
import { parseSender } from "@/server/providers/messaging";

describe("parseSender", () => {
  it("splits a display name from the address", () => {
    expect(parseSender("OgaSabi <no-reply@ogasabi.test>")).toEqual({
      name: "OgaSabi",
      email: "no-reply@ogasabi.test",
    });
    expect(parseSender('"Oga Sabi" <a@b.co>')).toEqual({ name: "Oga Sabi", email: "a@b.co" });
  });

  it("accepts a bare address", () => {
    expect(parseSender(" a@b.co ")).toEqual({ email: "a@b.co" });
    expect(parseSender("<a@b.co>")).toEqual({ email: "a@b.co" });
  });
});
