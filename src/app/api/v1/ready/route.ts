import { db } from "@/server/db/client";
import { logger } from "@/server/logger";
import { fail, ok } from "@/server/http/response";

export const dynamic = "force-dynamic";

/** Readiness: the database answers. Also reports which geo-search strategy the database supports. */
export async function GET() {
  try {
    const rows = await db.$queryRaw<{ postgis: boolean }[]>`
      SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS postgis`;
    const postgis = rows[0]?.postgis ?? false;
    return ok({ status: "ready", database: "up", geoSearch: postgis ? "postgis" : "haversine" });
  } catch (err) {
    logger.error({ err }, "readiness check failed");
    return fail("SERVICE_UNAVAILABLE", "The database is not reachable.", 503);
  }
}
