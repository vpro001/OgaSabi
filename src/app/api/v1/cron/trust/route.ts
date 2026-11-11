import { cronRoute } from "@/server/http/cron";
import { recomputeAllTrust } from "@/server/trust/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
// Run nightly: recency and penalty decay change scores even when nothing else happens.
export const POST = cronRoute("trust", async () => ({
  recomputed: await recomputeAllTrust("NIGHTLY"),
}));
