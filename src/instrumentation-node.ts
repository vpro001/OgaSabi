import net from "node:net";

// Node tries each address of a host (IPv4 and IPv6) for only 250 ms before moving on. On a slow
// link, or a network with no IPv6 route, every attempt gives up too early and outgoing calls to
// the email, SMS and payment providers die with "fetch failed". Give each attempt a fair chance.
net.setDefaultAutoSelectFamilyAttemptTimeout(5_000);

// Validate the configuration now, so a bad one fails at boot instead of on the first request.
if (process.env.SKIP_ENV_VALIDATION !== "1") {
  const { getEnv } = await import("@/env");
  getEnv();
}

export {};
