import { z } from "zod";
import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";

import { db } from "@/server/db/client";

const querySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const GET = route({ auth: true, query: querySchema }, async ({ user, query }) => {
  const [rows, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id, ...(query.cursor ? { id: { lt: query.cursor } } : {}) },
      orderBy: { id: "desc" },
      take: query.limit + 1,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        data: true,
        readAt: true,
        createdAt: true,
      },
    }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  const page = rows.slice(0, query.limit);
  return ok(
    {
      unread,
      notifications: page.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        href: (n.data as { href?: string } | null)?.href ?? null,
        read: !!n.readAt,
        createdAt: n.createdAt,
      })),
    },
    {
      meta: { nextCursor: rows.length > query.limit ? (page[page.length - 1]?.id ?? null) : null },
    },
  );
});

const readSchema = z.object({ ids: z.array(z.uuid()).max(100).optional() });

/** Marks the given notifications (or all of them) as read. */
export const POST = route({ auth: true, body: readSchema }, async ({ user, body }) => {
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null, ...(body.ids ? { id: { in: body.ids } } : {}) },
    data: { readAt: new Date() },
  });
  return ok({ unread: await db.notification.count({ where: { userId: user.id, readAt: null } }) });
});
