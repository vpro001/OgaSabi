import { z } from "zod";
import { route } from "@/server/http/handler";
import { ok } from "@/server/http/response";
import { Rules } from "@/server/rate-limit";

import { getEnv } from "@/env";
import { Errors } from "@/server/http/errors";
import { publicUrl, putObject, signedUrl, sniffFile } from "@/server/providers/storage";

const PURPOSES = {
  avatar: { visibility: "pub", pdf: false },
  portfolio: { visibility: "pub", pdf: false },
  request: { visibility: "pub", pdf: false },
  verification: { visibility: "priv", pdf: true },
  evidence: { visibility: "priv", pdf: true },
} as const;

/** Multipart upload: `file` plus `purpose`. Returns the storage key to attach to a later call. */
export const POST = route({ auth: true, rateLimit: Rules.upload }, async ({ req, user }) => {
  const env = getEnv();
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > env.UPLOAD_MAX_BYTES + 4096) throw Errors.validation(tooBig(env.UPLOAD_MAX_BYTES));
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const purpose = z
    .enum(["avatar", "portfolio", "request", "verification", "evidence"])
    .safeParse(form?.get("purpose"));
  if (!(file instanceof File) || !purpose.success)
    throw Errors.badRequest("Send a file and what it is for.");
  if (file.size === 0) throw Errors.validation("That file is empty.");
  if (file.size > env.UPLOAD_MAX_BYTES) throw Errors.validation(tooBig(env.UPLOAD_MAX_BYTES));
  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = sniffFile(bytes);
  const rule = PURPOSES[purpose.data];
  if (!kind || (kind.ext === "pdf" && !rule.pdf)) {
    throw Errors.validation(
      rule.pdf ? "Upload a JPG, PNG, WebP or PDF file." : "Upload a JPG, PNG or WebP image.",
    );
  }
  const key = `${rule.visibility}/${purpose.data}/${user.id}/${crypto.randomUUID()}.${kind.ext}`;
  await putObject(key, bytes, kind.mime);
  return ok(
    {
      key,
      url: rule.visibility === "pub" ? publicUrl(key) : signedUrl(key, 600),
      mime: kind.mime,
      size: bytes.length,
    },
    { status: 201 },
  );
});

function tooBig(max: number) {
  return `That file is too large. The limit is ${Math.round(max / 1_048_576)} MB.`;
}
