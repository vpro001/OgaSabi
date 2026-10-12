import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0"])
  .default("false")
  .transform((v) => v === "true" || v === "1");

const csv = z
  .string()
  .default("")
  .transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    APP_URL: z.url(),
    DATABASE_URL: z.string().min(1),

    // Auth
    JWT_ACCESS_SECRET: z.string().min(32, "must be at least 32 characters"),
    DATA_HMAC_SECRET: z.string().min(32, "must be at least 32 characters"), // OTP codes, ID-number hashes
    ACCESS_TOKEN_TTL_SEC: z.coerce.number().int().min(60).max(3600).default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    COOKIE_DOMAIN: z.string().optional(),
    CORS_ALLOWED_ORIGINS: csv, // web origins; mobile apps send no Origin header

    // SMS / OTP
    SMS_PROVIDER: z.enum(["mock", "termii"]).default("mock"),
    TERMII_API_KEY: z.string().optional(),
    TERMII_SENDER_ID: z.string().optional(),
    OTP_TTL_SEC: z.coerce.number().int().min(60).max(900).default(300),

    // File storage
    STORAGE_PROVIDER: z.enum(["mock", "s3", "cloudinary"]).default("mock"),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_PUBLIC_BASE_URL: z.string().optional(),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    UPLOAD_MAX_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(8 * 1024 * 1024),

    // Payments (feature-flagged off by default)
    PAYMENTS_ENABLED: bool,
    PAYSTACK_SECRET_KEY: z.string().optional(),

    // Push + observability
    EXPO_ACCESS_TOKEN: z.string().optional(),
    SENTRY_DSN: z.string().optional(),

    // Scheduled jobs
    CRON_SECRET: z.string().min(24, "must be at least 24 characters"),

    // Domain defaults (locale-configurable)
    DEFAULT_LOCALE: z.string().default("en-NG"),
    DEFAULT_CURRENCY: z.string().length(3).default("NGN"),
    DEFAULT_COUNTRY: z.string().length(2).default("NG"),
    DEFAULT_CALLING_CODE: z
      .string()
      .regex(/^\d{1,3}$/)
      .default("234"),
    DEFAULT_TIMEZONE: z.string().default("Africa/Lagos"),
    SEARCH_DEFAULT_RADIUS_KM: z.coerce.number().positive().default(5),
    SEARCH_MAX_RADIUS_KM: z.coerce.number().positive().default(50),
    REQUEST_EXPIRY_HOURS: z.coerce.number().positive().default(24),

    // Explicit opt-out of the production guards, for running the production image on a laptop
    // (docker compose). Never set this on a real deployment.
    ALLOW_INSECURE_LOCAL: bool,
  })
  .superRefine((env, ctx) => {
    const need = (cond: boolean, path: string, message: string) => {
      if (cond) ctx.addIssue({ code: "custom", path: [path], message });
    };
    if (env.SMS_PROVIDER === "termii") {
      need(!env.TERMII_API_KEY, "TERMII_API_KEY", "required when SMS_PROVIDER=termii");
      need(!env.TERMII_SENDER_ID, "TERMII_SENDER_ID", "required when SMS_PROVIDER=termii");
    }
    if (env.STORAGE_PROVIDER === "s3") {
      for (const k of [
        "S3_BUCKET",
        "S3_REGION",
        "S3_ACCESS_KEY_ID",
        "S3_SECRET_ACCESS_KEY",
      ] as const) {
        need(!env[k], k, "required when STORAGE_PROVIDER=s3");
      }
    }
    if (env.STORAGE_PROVIDER === "cloudinary") {
      for (const k of [
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
      ] as const) {
        need(!env[k], k, "required when STORAGE_PROVIDER=cloudinary");
      }
    }
    need(
      env.PAYMENTS_ENABLED && !env.PAYSTACK_SECRET_KEY,
      "PAYSTACK_SECRET_KEY",
      "required when PAYMENTS_ENABLED=true",
    );
    need(
      env.SEARCH_DEFAULT_RADIUS_KM > env.SEARCH_MAX_RADIUS_KM,
      "SEARCH_DEFAULT_RADIUS_KM",
      "must not exceed SEARCH_MAX_RADIUS_KM",
    );
    if (env.NODE_ENV === "production" && !env.ALLOW_INSECURE_LOCAL) {
      need(
        env.SMS_PROVIDER === "mock",
        "SMS_PROVIDER",
        "the mock SMS provider is not allowed in production",
      );
      need(
        env.STORAGE_PROVIDER === "mock",
        "STORAGE_PROVIDER",
        "the mock storage provider is not allowed in production",
      );
      need(!env.APP_URL.startsWith("https://"), "APP_URL", "must use https in production");
    }
  });

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map(
      (i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`,
    );
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
  }
  return result.data;
}

let cached: Env | undefined;

/** Validated, memoised environment. Throws with a readable list of problems. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
