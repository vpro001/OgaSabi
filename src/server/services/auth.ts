import { hash, verify } from "argon2";
import { type z } from "zod";
import { getEnv } from "@/env";
import { db } from "@/server/db/client";
import { Errors } from "@/server/http/errors";
import { hmac, newOtpCode, safeEqual } from "@/server/auth/tokens";
import { revokeAllSessions } from "@/server/auth/session";
import { sendEmail, sendSms } from "@/server/providers/messaging";
import { isValidKey, keyOwner, publicUrl } from "@/server/providers/storage";
import { audit } from "@/server/services/notifications";
import { normalizePhone } from "@/lib/phone";
import {
  type changePasswordSchema,
  type registerSchema,
  type resetPasswordSchema,
  type updateProfileSchema,
} from "@/lib/schemas";
import { type OtpChannel, type OtpPurpose, Prisma } from "@/generated/prisma/client";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
// Verifying against a real hash when the account does not exist keeps response times uniform.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hash("ogasabi-timing-equaliser"));

export type Identifier = { email?: string; phone?: string };

export function parseIdentifier(raw: string): Identifier | null {
  const value = raw.trim();
  if (value.includes("@")) return { email: value.toLowerCase() };
  const phone = normalizePhone(value);
  return phone ? { phone } : null;
}

function uniqueViolation(err: unknown): string | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = JSON.stringify(err.meta ?? {});
    return target.includes("phone") ? "phone" : "email";
  }
  return null;
}

export async function register(input: z.infer<typeof registerSchema>) {
  const email = input.email?.toLowerCase();
  let phone: string | undefined;
  if (input.phone) {
    const normalised = normalizePhone(input.phone);
    if (!normalised) {
      throw Errors.validation("phone: Enter a valid phone number", {
        fields: { phone: "Enter a valid phone number, e.g. 0803 123 4567" },
      });
    }
    phone = normalised;
  }
  const now = new Date();
  try {
    return await db.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: email ?? null,
        phone: phone ?? null,
        passwordHash: await hash(input.password),
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
        marketingConsent: input.marketingConsent ?? false,
        lastLoginAt: now,
      },
      select: { id: true, roles: true },
    });
  } catch (err) {
    const field = uniqueViolation(err);
    if (field) {
      const message =
        field === "phone"
          ? "An account already uses this phone number. Sign in instead."
          : "An account already uses this email address. Sign in instead.";
      throw Errors.conflict(message, "ACCOUNT_EXISTS");
    }
    throw err;
  }
}

export async function login(identifierRaw: string, password: string) {
  const fail = () => Errors.unauthorized("Incorrect email/phone or password.");
  const identifier = parseIdentifier(identifierRaw);
  const user = identifier
    ? await db.user.findFirst({
        where: {
          ...(identifier.email ? { email: identifier.email } : { phone: identifier.phone }),
          deletedAt: null,
        },
        select: {
          id: true,
          roles: true,
          status: true,
          passwordHash: true,
          failedLoginCount: true,
          lockedUntil: true,
        },
      })
    : null;

  if (!user || !user.passwordHash) {
    await verify(await getDummyHash(), password).catch(() => false);
    throw fail();
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw Errors.tooMany((user.lockedUntil.getTime() - Date.now()) / 1000);
  }
  const ok = await verify(user.passwordHash, password).catch(() => false);
  if (!ok) {
    const count = user.failedLoginCount + 1;
    await db.user.update({
      where: { id: user.id },
      data:
        count >= MAX_FAILED_LOGINS
          ? { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
          : { failedLoginCount: count },
    });
    throw fail();
  }
  if (user.status === "SUSPENDED") {
    throw Errors.forbidden(
      "This account is suspended. Contact support if you think this is a mistake.",
    );
  }
  if (user.status !== "ACTIVE") throw fail();
  await db.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  return { id: user.id, roles: user.roles };
}

// ── One-time codes ─────────────────────────────────────────────────────────────────────────

const codeHash = (target: string, purpose: OtpPurpose, code: string) =>
  hmac(`otp:${purpose}:${target}:${code}`);

export async function sendOtp(args: {
  target: string;
  channel: OtpChannel;
  purpose: OtpPurpose;
  userId?: string;
  ip?: string;
}): Promise<{ expiresInSec: number; devCode?: string }> {
  const env = getEnv();
  const code = newOtpCode();
  // A new code replaces any earlier one for the same target and purpose.
  await db.otpCode.updateMany({
    where: { target: args.target, purpose: args.purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  await db.otpCode.create({
    data: {
      userId: args.userId ?? null,
      target: args.target,
      channel: args.channel,
      purpose: args.purpose,
      codeHash: codeHash(args.target, args.purpose, code),
      ip: args.ip ?? null,
      expiresAt: new Date(Date.now() + env.OTP_TTL_SEC * 1000),
    },
  });
  const minutes = Math.round(env.OTP_TTL_SEC / 60);
  const text =
    args.purpose === "PASSWORD_RESET"
      ? `Your OgaSabi password reset code is ${code}. It expires in ${minutes} minutes. If you did not ask for it, ignore this message.`
      : `Your OgaSabi verification code is ${code}. It expires in ${minutes} minutes. Never share it with anyone.`;
  const sent =
    args.channel === "SMS"
      ? await sendSms(args.target, text)
      : await sendEmail(args.target, "Your OgaSabi code", text);
  if (!sent.ok) throw new Error(`could not deliver one-time code: ${sent.error}`);
  const isMock =
    args.channel === "SMS" ? env.SMS_PROVIDER === "mock" : env.EMAIL_PROVIDER === "mock";
  // With mock providers nothing is really delivered, so local development gets the code back.
  return {
    expiresInSec: env.OTP_TTL_SEC,
    ...(isMock && env.NODE_ENV !== "production" ? { devCode: code } : {}),
  };
}

export async function consumeOtp(target: string, purpose: OtpPurpose, code: string): Promise<void> {
  const row = await db.otpCode.findFirst({
    where: { target, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const bad = () => Errors.badRequest("That code is incorrect or has expired. Request a new one.");
  if (!row || row.expiresAt < new Date() || row.attempts >= row.maxAttempts) throw bad();
  if (!safeEqual(row.codeHash, codeHash(target, purpose, code))) {
    await db.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    throw bad();
  }
  const claimed = await db.otpCode.updateMany({
    where: { id: row.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (claimed.count !== 1) throw bad();
}

/** Always resolves the same way, so the endpoint does not reveal whether an account exists. */
export async function forgotPassword(
  identifierRaw: string,
  ip: string,
): Promise<{ devCode?: string }> {
  const identifier = parseIdentifier(identifierRaw);
  if (!identifier) return {};
  const user = await db.user.findFirst({
    where: {
      ...(identifier.email ? { email: identifier.email } : { phone: identifier.phone }),
      deletedAt: null,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!user) return {};
  const target = (identifier.email ?? identifier.phone) as string;
  const { devCode } = await sendOtp({
    target,
    channel: identifier.email ? "EMAIL" : "SMS",
    purpose: "PASSWORD_RESET",
    userId: user.id,
    ip,
  });
  return { devCode };
}

export async function resetPassword(input: z.infer<typeof resetPasswordSchema>, ip: string) {
  const identifier = parseIdentifier(input.identifier);
  if (!identifier)
    throw Errors.badRequest("That code is incorrect or has expired. Request a new one.");
  const target = (identifier.email ?? identifier.phone) as string;
  await consumeOtp(target, "PASSWORD_RESET", input.code);
  const user = await db.user.findFirst({
    where: { ...(identifier.email ? { email: target } : { phone: target }), deletedAt: null },
    select: { id: true },
  });
  if (!user) throw Errors.badRequest("That code is incorrect or has expired. Request a new one.");
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hash(input.password),
      failedLoginCount: 0,
      lockedUntil: null,
      // Receiving the code proves control of that contact.
      ...(identifier.email ? { emailVerifiedAt: new Date() } : { phoneVerifiedAt: new Date() }),
    },
  });
  await revokeAllSessions(user.id);
  await audit(db, {
    actorId: user.id,
    actorRole: "CUSTOMER",
    action: "user.password_reset",
    entityType: "user",
    entityId: user.id,
    ip,
  });
}

export async function changePassword(
  userId: string,
  familyId: string,
  input: z.infer<typeof changePasswordSchema>,
) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordHash: true },
  });
  const ok = user.passwordHash
    ? await verify(user.passwordHash, input.currentPassword).catch(() => false)
    : false;
  if (!ok) {
    throw Errors.validation("currentPassword: Your current password is incorrect", {
      fields: { currentPassword: "Your current password is incorrect" },
    });
  }
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hash(input.newPassword) },
  });
  await revokeAllSessions(userId, familyId);
}

// ── Profile ────────────────────────────────────────────────────────────────────────────────

export async function getMe(userId: string) {
  const [user, unread] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        roles: true,
        avatarKey: true,
        marketingConsent: true,
        createdAt: true,
        artisanProfile: {
          select: {
            id: true,
            status: true,
            businessName: true,
            verificationLevel: true,
            deletedAt: true,
          },
        },
      },
    }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);
  const artisan =
    user.artisanProfile && !user.artisanProfile.deletedAt ? user.artisanProfile : null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    emailVerified: !!user.emailVerifiedAt,
    phoneVerified: !!user.phoneVerifiedAt,
    roles: user.roles,
    avatarUrl: user.avatarKey ? publicUrl(user.avatarKey) : null,
    marketingConsent: user.marketingConsent,
    createdAt: user.createdAt,
    artisan: artisan
      ? {
          id: artisan.id,
          status: artisan.status,
          businessName: artisan.businessName,
          verificationLevel: artisan.verificationLevel,
        }
      : null,
    unreadNotifications: unread,
    paymentsEnabled: getEnv().PAYMENTS_ENABLED,
  };
}

export async function updateProfile(userId: string, input: z.infer<typeof updateProfileSchema>) {
  const current = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, phone: true },
  });
  const data: Prisma.UserUpdateInput = {};
  if (input.firstName) data.firstName = input.firstName;
  if (input.lastName) data.lastName = input.lastName;
  if (input.marketingConsent !== undefined) data.marketingConsent = input.marketingConsent;

  let email = current.email;
  let phone = current.phone;
  if (input.email !== undefined) {
    email = input.email ? input.email.toLowerCase() : null;
    if (email !== current.email) {
      data.email = email;
      data.emailVerifiedAt = null;
    }
  }
  if (input.phone !== undefined) {
    if (input.phone) {
      const normalised = normalizePhone(input.phone);
      if (!normalised) {
        throw Errors.validation("phone: Enter a valid phone number", {
          fields: { phone: "Enter a valid phone number, e.g. 0803 123 4567" },
        });
      }
      phone = normalised;
    } else phone = null;
    if (phone !== current.phone) {
      data.phone = phone;
      data.phoneVerifiedAt = null;
    }
  }
  if (!email && !phone) {
    throw Errors.validation(
      "Keep at least one way to reach you: an email address or a phone number.",
    );
  }
  if (input.avatarKey !== undefined) {
    if (input.avatarKey !== null) {
      if (
        !isValidKey(input.avatarKey) ||
        keyOwner(input.avatarKey) !== userId ||
        !input.avatarKey.startsWith("pub/avatar/")
      ) {
        throw Errors.badRequest("That image could not be used. Upload it again.");
      }
    }
    data.avatarKey = input.avatarKey;
  }
  try {
    await db.user.update({ where: { id: userId }, data });
  } catch (err) {
    const field = uniqueViolation(err);
    if (field) {
      throw Errors.conflict(
        field === "phone"
          ? "Another account already uses this phone number."
          : "Another account already uses this email address.",
        "ACCOUNT_EXISTS",
      );
    }
    throw err;
  }
  return getMe(userId);
}

/** Soft-deletes and anonymises the account (NDPR right to erasure). Job history is kept. */
export async function deleteAccount(userId: string, password: string, ip: string): Promise<void> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordHash: true, artisanProfile: { select: { id: true } } },
  });
  const ok = user.passwordHash
    ? await verify(user.passwordHash, password).catch(() => false)
    : false;
  if (!ok)
    throw Errors.validation("password: Your password is incorrect", {
      fields: { password: "Your password is incorrect" },
    });
  const open = await db.serviceRequest.count({
    where: {
      OR: [
        { customerId: userId },
        ...(user.artisanProfile ? [{ artisanId: user.artisanProfile.id }] : []),
      ],
      status: { in: ["ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "AWAITING_CONFIRMATION", "DISPUTED"] },
    },
  });
  if (open > 0) {
    throw Errors.conflict(
      "You have jobs in progress. Finish or cancel them before deleting your account.",
      "OPEN_JOBS",
    );
  }
  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        status: "DELETED",
        deletedAt: now,
        anonymizedAt: now,
        email: null,
        phone: null,
        passwordHash: null,
        avatarKey: null,
        firstName: "Deleted",
        lastName: "User",
      },
    });
    if (user.artisanProfile) {
      await tx.artisanProfile.update({
        where: { id: user.artisanProfile.id },
        data: { deletedAt: now, status: "SUSPENDED", whatsappNumber: null, isAvailableNow: false },
      });
    }
    await tx.serviceRequest.updateMany({
      where: { customerId: userId, status: { in: ["PENDING", "QUOTED"] } },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelledById: userId,
        cancelledByRole: "CUSTOMER",
        cancellationReason: "Account deleted",
      },
    });
    if (user.artisanProfile) {
      await tx.serviceRequest.updateMany({
        where: { artisanId: user.artisanProfile.id, status: { in: ["PENDING", "QUOTED"] } },
        data: { status: "DECLINED", declineReason: "Artisan is no longer on OgaSabi" },
      });
    }
    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.deviceToken.deleteMany({ where: { userId } });
    await tx.favorite.deleteMany({ where: { userId } });
    await audit(tx, {
      actorId: userId,
      actorRole: "CUSTOMER",
      action: "user.delete_self",
      entityType: "user",
      entityId: userId,
      ip,
    });
  });
}
