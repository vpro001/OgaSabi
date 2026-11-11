import { cronRoute } from "@/server/http/cron";
import { runRequestMaintenance } from "@/server/services/requests";

export const dynamic = "force-dynamic";
// Run every 10 minutes: expires unanswered requests and quotes, auto-confirms stale jobs.
export const POST = cronRoute("maintenance", () => runRequestMaintenance());
