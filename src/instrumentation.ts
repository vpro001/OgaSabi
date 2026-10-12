// Runs once when the Next.js server boots, so a bad configuration fails fast instead of on the first request.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SKIP_ENV_VALIDATION !== "1") {
    const { getEnv } = await import("@/env");
    getEnv();
  }
}
