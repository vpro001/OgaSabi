import pino from "pino";

// JSON logs everywhere (pipe through `pino-pretty` locally: `npm run dev:pretty`).
// Secrets and credentials are redacted by path so they can never reach a log line by accident.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "ogasabi" },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "password",
      "*.password",
      "passwordHash",
      "*.passwordHash",
      "token",
      "*.token",
      "refreshToken",
      "*.refreshToken",
      "accessToken",
      "*.accessToken",
      "code",
      "*.code",
      "otp",
      "*.otp",
      "authorization",
      "*.authorization",
      "headers.authorization",
      "headers.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
      "secret",
      "*.secret",
      "documentNumber",
      "*.documentNumber",
    ],
    censor: "[redacted]",
  },
});

export type Logger = typeof logger;
