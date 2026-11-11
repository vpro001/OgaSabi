import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";

import { db } from "@/server/db/client";
import { Errors } from "@/server/http/errors";
import { reportSchema } from "@/lib/schemas";

export const POST = route(
  { auth: true, body: reportSchema, rateLimit: Rules.report },
  async ({ user, body }) => {
    const target =
      body.targetType === "USER"
        ? await db.user.findFirst({
            where: { id: body.targetId, deletedAt: null },
            select: { id: true },
          })
        : body.targetType === "REVIEW"
          ? await db.review.findUnique({ where: { id: body.targetId }, select: { id: true } })
          : await db.message.findFirst({
              where: {
                id: body.targetId,
                request: { OR: [{ customerId: user.id }, { artisan: { userId: user.id } }] },
              },
              select: { id: true },
            });
    if (!target) throw Errors.notFound("That content");
    if (body.targetType === "USER" && body.targetId === user.id)
      throw Errors.badRequest("You cannot report yourself.");
    await db.report.create({
      data: {
        reporterId: user.id,
        targetType: body.targetType,
        targetUserId: body.targetType === "USER" ? body.targetId : null,
        targetReviewId: body.targetType === "REVIEW" ? body.targetId : null,
        targetMessageId: body.targetType === "MESSAGE" ? body.targetId : null,
        reason: body.reason,
        details: body.details ?? null,
      },
    });
    return ok({ reported: true }, { status: 201 });
  },
);
