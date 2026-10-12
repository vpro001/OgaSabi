import { describe, expect, it } from "vitest";
import { parseEnv } from "@/env";

const valid = {
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://ogasabi:ogasabi@localhost:5432/ogasabi",
  JWT_ACCESS_SECRET: "a".repeat(32),
  DATA_HMAC_SECRET: "b".repeat(32),
  CRON_SECRET: "c".repeat(24),
};

describe("parseEnv", () => {
  it("applies Nigerian defaults", () => {
    const env = parseEnv(valid);
    expect(env).toMatchObject({
      DEFAULT_CURRENCY: "NGN",
      DEFAULT_CALLING_CODE: "234",
      SMS_PROVIDER: "mock",
      PAYMENTS_ENABLED: false,
      SEARCH_DEFAULT_RADIUS_KM: 5,
    });
  });

  it("lists every problem at once", () => {
    expect(() => parseEnv({})).toThrow(/APP_URL[\s\S]*DATABASE_URL[\s\S]*JWT_ACCESS_SECRET/);
  });

  it("rejects short secrets", () => {
    expect(() => parseEnv({ ...valid, JWT_ACCESS_SECRET: "short" })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("requires provider credentials when a provider is selected", () => {
    expect(() => parseEnv({ ...valid, SMS_PROVIDER: "termii" })).toThrow(/TERMII_API_KEY/);
    expect(() => parseEnv({ ...valid, PAYMENTS_ENABLED: "true" })).toThrow(/PAYSTACK_SECRET_KEY/);
  });

  it("refuses mock providers and http in production", () => {
    expect(() => parseEnv({ ...valid, NODE_ENV: "production" })).toThrow(
      /mock SMS[\s\S]*mock storage[\s\S]*https/,
    );
  });

  it("lets ALLOW_INSECURE_LOCAL bypass the production guards (docker compose only)", () => {
    expect(
      parseEnv({ ...valid, NODE_ENV: "production", ALLOW_INSECURE_LOCAL: "true" }).SMS_PROVIDER,
    ).toBe("mock");
  });

  it("parses CORS origins from CSV", () => {
    expect(
      parseEnv({ ...valid, CORS_ALLOWED_ORIGINS: "https://a.com, https://b.com" })
        .CORS_ALLOWED_ORIGINS,
    ).toEqual(["https://a.com", "https://b.com"]);
  });
});
