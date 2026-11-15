// Runs once when the Next.js server boots, so a bad configuration fails fast instead of on the first request.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Node tries each address of a host (IPv4 and IPv6) for only 250 ms before moving on. On a slow
  // link, or a network with no IPv6 route, every attempt gives up too early and outgoing calls to
  // the email, SMS and payment providers die with "fetch failed". Give each attempt a fair chance.
  const net = await import("node:net");
  net.setDefaultAutoSelectFamilyAttemptTimeout(5_000);

  if (process.env.SKIP_ENV_VALIDATION !== "1") {
    const { getEnv } = await import("@/env");
    getEnv();
  }
}
