import { type NextRequest } from "next/server";
import { getEnv } from "@/env";
import { safeEqual } from "@/server/auth/tokens";
import { fail, ok } from "@/server/http/response";
import { logger } from "@/server/logger";

/** Scheduled jobs are plain HTTP endpoints guarded by `Authorization: Bearer <CRON_SECRET>`. */
export function cronRoute(name: string, job: () => Promise<unknown>) {
  return async (req: NextRequest) => {
    const header = req.headers.get("authorization") ?? "";
    if (!safeEqual(header, `Bearer ${getEnv().CRON_SECRET}`))
      return fail("UNAUTHORIZED", "Invalid cron secret.", 401);
    const started = Date.now();
    try {
      const result = await job();
      logger.info({ job: name, ms: Date.now() - started, result }, "cron job finished");
      return ok({ job: name, result });
    } catch (err) {
      logger.error({ err, job: name }, "cron job failed");
      return fail("INTERNAL_ERROR", "The job failed.", 500);
    }
  };
}
