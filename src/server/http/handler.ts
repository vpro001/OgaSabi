import { type NextRequest, type NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/env";
import { logger } from "@/server/logger";
import { AppError, Errors } from "@/server/http/errors";
import { fail } from "@/server/http/response";
import { resolveSession, type SessionUser } from "@/server/auth/session";
import { enforceRateLimit, type RateRule } from "@/server/rate-limit";
import { type UserRole } from "@/generated/prisma/client";

export type Ctx<P, B, Q, Auth extends boolean> = {
  req: NextRequest;
  params: P;
  body: B;
  query: Q;
  user: Auth extends true ? SessionUser : SessionUser | null;
  ip: string;
  userAgent: string | null;
  requestId: string;
};

type Options<B, Q, Auth extends boolean> = {
  /** `true` requires a session, `false` (default) resolves one if present. */
  auth?: Auth;
  roles?: UserRole[];
  body?: z.ZodType<B>;
  query?: z.ZodType<Q>;
  /** Limited per signed-in user when there is one, otherwise per IP. */
  rateLimit?: RateRule;
};

export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Cookie-authenticated writes must come from our own origin (CSRF defence on top of SameSite). */
function assertSameOrigin(req: NextRequest): void {
  const origin = req.headers.get("origin");
  if (!origin) {
    if (req.headers.get("sec-fetch-site") === "cross-site") throw Errors.forbidden();
    return;
  }
  const env = getEnv();
  const allowed = new Set([new URL(env.APP_URL).origin, ...env.CORS_ALLOWED_ORIGINS]);
  if (env.NODE_ENV !== "production") allowed.add(new URL(req.url).origin);
  if (!allowed.has(origin)) throw Errors.forbidden("Cross-site requests are not allowed.");
}

function describeIssues(error: z.ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_";
    fields[path] ??= issue.message;
  }
  const first = error.issues[0];
  const where = first && first.path.length ? `${first.path.join(".")}: ` : "";
  return { message: `${where}${first?.message ?? "Invalid input"}`, fields };
}

/**
 * Wraps a route handler with the cross-cutting concerns every endpoint shares: request id,
 * session, role check, CSRF, rate limiting, validation and uniform error envelopes.
 */
export function route<P = Record<string, string>, B = undefined, Q = undefined>(
  options: Options<B, Q, true> & { auth: true },
  fn: (ctx: Ctx<P, B, Q, true>) => Promise<NextResponse | Response>,
): (req: NextRequest, segment: { params: Promise<P> }) => Promise<Response>;
export function route<P = Record<string, string>, B = undefined, Q = undefined>(
  options: Options<B, Q, false>,
  fn: (ctx: Ctx<P, B, Q, false>) => Promise<NextResponse | Response>,
): (req: NextRequest, segment: { params: Promise<P> }) => Promise<Response>;
export function route<P, B, Q>(
  options: Options<B, Q, boolean>,
  fn: (ctx: Ctx<P, B, Q, boolean>) => Promise<NextResponse | Response>,
) {
  return async (req: NextRequest, segment: { params: Promise<P> }): Promise<Response> => {
    const requestId = req.headers.get("x-request-id")?.slice(0, 64) || crypto.randomUUID();
    const started = Date.now();
    const ip = clientIp(req);
    let userId: string | undefined;
    let res: Response;
    try {
      const session = await resolveSession(req);
      userId = session?.user.id;
      if (MUTATING.has(req.method) && (session?.viaCookie || !req.headers.get("authorization"))) {
        assertSameOrigin(req);
      }
      if (options.auth && !session) throw Errors.unauthorized();
      if (options.roles && !options.roles.some((r) => session?.user.roles.includes(r))) {
        throw session ? Errors.forbidden() : Errors.unauthorized();
      }
      if (options.rateLimit) enforceRateLimit(options.rateLimit, userId ?? `ip:${ip}`);

      let query = undefined as Q;
      if (options.query) {
        const raw = Object.fromEntries(new URL(req.url).searchParams.entries());
        const parsed = options.query.safeParse(raw);
        if (!parsed.success) {
          const d = describeIssues(parsed.error);
          throw Errors.badRequest(d.message, { fields: d.fields });
        }
        query = parsed.data;
      }

      let body = undefined as B;
      if (options.body) {
        let raw: unknown;
        try {
          raw = await req.json();
        } catch {
          throw Errors.badRequest("The request body must be valid JSON.");
        }
        const parsed = options.body.safeParse(raw);
        if (!parsed.success) {
          const d = describeIssues(parsed.error);
          throw Errors.validation(d.message, { fields: d.fields });
        }
        body = parsed.data;
      }

      res = await fn({
        req,
        params: await segment.params,
        body,
        query,
        user: session?.user ?? null,
        ip,
        userAgent: req.headers.get("user-agent"),
        requestId,
      });
    } catch (err) {
      if (err instanceof AppError) {
        res = fail(err.code, err.message, err.status, err.details, err.headers);
      } else if (err instanceof z.ZodError) {
        const d = describeIssues(err);
        res = fail("VALIDATION_ERROR", d.message, 422, { fields: d.fields });
      } else {
        logger.error({ err, requestId, path: new URL(req.url).pathname }, "unhandled route error");
        res = fail("INTERNAL_ERROR", "Something went wrong on our side. Please try again.", 500);
      }
    }
    res.headers.set("x-request-id", requestId);
    if (!res.headers.has("cache-control")) res.headers.set("cache-control", "no-store");
    const ms = Date.now() - started;
    const line = {
      requestId,
      method: req.method,
      path: new URL(req.url).pathname,
      status: res.status,
      ms,
      userId,
    };
    if (res.status >= 500) logger.error(line, "request");
    else logger.debug(line, "request");
    return res;
  };
}

export const uuidParam = z.uuid("Invalid id");

export function assertUuid(value: string, what = "Resource"): string {
  if (!uuidParam.safeParse(value).success) throw Errors.notFound(what);
  return value;
}
