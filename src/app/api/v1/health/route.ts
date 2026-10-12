import { ok } from "@/server/http/response";

export const dynamic = "force-dynamic";

/** Liveness: the process is up. Does not touch the database. */
export function GET() {
  return ok({ status: "ok", uptimeSec: Math.round(process.uptime()) });
}
