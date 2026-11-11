import { z } from "zod";
import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";

import { db } from "@/server/db/client";
import { CONFIGURABLE_TYPES, defaultChannels } from "@/server/services/notifications";

export const GET = route({ auth: true }, async ({ user }) => {
  const saved = await db.notificationPreference.findMany({ where: { userId: user.id } });
  return ok(
    CONFIGURABLE_TYPES.map((type) => {
      const channels = saved.find((s) => s.type === type)?.channels ?? defaultChannels(type);
      return { type, sms: channels.includes("SMS"), email: channels.includes("EMAIL") };
    }),
  );
});

const bodySchema = z.object({
  preferences: z
    .array(
      z.object({
        type: z.enum(CONFIGURABLE_TYPES as [string, ...string[]]),
        sms: z.boolean(),
        email: z.boolean(),
      }),
    )
    .max(30),
});

export const PUT = route(
  { auth: true, body: bodySchema, rateLimit: Rules.write },
  async ({ user, body }) => {
    await db.$transaction(
      body.preferences.map((p) => {
        const type = p.type as (typeof CONFIGURABLE_TYPES)[number];
        const channels = [
          ...(p.sms ? (["SMS"] as const) : []),
          ...(p.email ? (["EMAIL"] as const) : []),
        ];
        return db.notificationPreference.upsert({
          where: { userId_type: { userId: user.id, type } },
          create: { userId: user.id, type, channels },
          update: { channels },
        });
      }),
    );
    return ok({ saved: true });
  },
);
