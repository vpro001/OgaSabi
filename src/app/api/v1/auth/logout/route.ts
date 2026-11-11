import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { clearSessionCookies, revokeFamily } from "@/server/auth/session";

export const POST = route({}, async ({ user }) => {
  if (user) await revokeFamily(user.familyId);
  const res = ok({ signedOut: true });
  clearSessionCookies(res);
  return res;
});
