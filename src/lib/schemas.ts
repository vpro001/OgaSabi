// Validation shared by the API (authoritative) and the forms (fast feedback).
import { z } from "zod";

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const registerSchema = z
  .object({
    firstName: trimmed(1, 60, "First name"),
    lastName: trimmed(1, 60, "Last name"),
    email: optionalText(254).pipe(z.email("Enter a valid email address").optional()),
    phone: optionalText(20),
    password: passwordSchema,
    acceptTerms: z.literal(true, "You must accept the terms to continue"),
    marketingConsent: z.boolean().optional(),
  })
  .refine((v) => v.email || v.phone, {
    path: ["email"],
    message: "Enter an email address or a phone number",
  });

export const loginSchema = z.object({
  identifier: trimmed(3, 254, "Email or phone"),
  password: z.string().min(1, "Enter your password").max(128),
});

export const forgotPasswordSchema = z.object({ identifier: trimmed(3, 254, "Email or phone") });

export const resetPasswordSchema = z.object({
  identifier: trimmed(3, 254, "Email or phone"),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code"),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(128),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  firstName: trimmed(1, 60, "First name").optional(),
  lastName: trimmed(1, 60, "Last name").optional(),
  email: z.union([z.email("Enter a valid email address"), z.literal("")]).optional(),
  phone: z.string().trim().max(20).optional(),
  avatarKey: z.string().max(200).nullable().optional(),
  marketingConsent: z.boolean().optional(),
});

export const otpVerifySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code"),
});

const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);

export const createRequestSchema = z
  .object({
    artisanId: z.uuid(),
    categoryId: z.uuid("Choose the kind of work"),
    description: trimmed(20, 2000, "Description"),
    addressLine: trimmed(5, 200, "Address"),
    landmark: optionalText(120),
    areaLabel: trimmed(2, 80, "Area"),
    city: optionalText(60),
    state: optionalText(60),
    lat,
    lng,
    isImmediate: z.boolean(),
    scheduledFor: z.iso.datetime({ offset: true }).nullable().optional(),
    photoKeys: z.array(z.string().max(200)).max(6).default([]),
  })
  .refine((v) => v.isImmediate || !!v.scheduledFor, {
    path: ["scheduledFor"],
    message: "Pick a date and time, or choose “as soon as possible”",
  });

export const requestActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("decline"), reason: trimmed(3, 300, "Reason") }),
  z.object({
    action: z.literal("quote"),
    amountKobo: z.number().int().min(50_000, "Minimum quote is ₦500").max(5_000_000_00),
    note: optionalText(500),
  }),
  z.object({ action: z.literal("accept_quote") }),
  z.object({ action: z.literal("reject_quote"), reason: optionalText(300) }),
  z.object({ action: z.literal("en_route") }),
  z.object({ action: z.literal("start") }),
  z.object({
    action: z.literal("mark_complete"),
    finalAmountKobo: z.number().int().min(0).max(5_000_000_00).optional(),
  }),
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("cancel"), reason: trimmed(3, 300, "Reason") }),
]);
export type RequestAction = z.infer<typeof requestActionSchema>;

export const messageSchema = z.object({ body: trimmed(1, 2000, "Message") });

export const REVIEW_TAGS = [
  "PUNCTUAL",
  "CLEAN_WORK",
  "FAIR_PRICE",
  "GOOD_COMMUNICATION",
  "KNOWLEDGEABLE",
  "POLITE",
  "FAST",
  "WOULD_HIRE_AGAIN",
  "LATE",
  "OVERPRICED",
  "MESSY",
  "POOR_COMMUNICATION",
] as const;

export const reviewSchema = z.object({
  rating: z.number().int().min(1, "Choose a rating").max(5),
  tags: z.array(z.enum(REVIEW_TAGS)).max(6).default([]),
  comment: optionalText(1500),
});

export const reviewReplySchema = z.object({ body: trimmed(2, 1000, "Reply") });

export const COMPLAINT_CATEGORIES = [
  "NO_SHOW",
  "LATE_ARRIVAL",
  "POOR_WORKMANSHIP",
  "OVERCHARGING",
  "RUDE_BEHAVIOUR",
  "UNSAFE_WORK",
  "PROPERTY_DAMAGE",
  "ABANDONED_JOB",
  "FRAUD",
  "NON_PAYMENT",
  "OTHER",
] as const;

export const complaintSchema = z.object({
  category: z.enum(COMPLAINT_CATEGORIES),
  description: trimmed(20, 2000, "Description"),
  evidenceKeys: z.array(z.string().max(200)).max(5).default([]),
});

export const disputeSchema = z.object({
  reason: trimmed(3, 120, "Reason"),
  description: trimmed(20, 2000, "Description"),
  evidenceKeys: z.array(z.string().max(200)).max(5).default([]),
});

export const reportSchema = z.object({
  targetType: z.enum(["USER", "REVIEW", "MESSAGE"]),
  targetId: z.uuid(),
  reason: z.enum([
    "SPAM",
    "FAKE_PROFILE",
    "FAKE_REVIEW",
    "HARASSMENT",
    "FRAUD",
    "INAPPROPRIATE_CONTENT",
    "OTHER",
  ]),
  details: optionalText(1000),
});

export const artisanProfileSchema = z
  .object({
    businessName: trimmed(3, 80, "Business name"),
    bio: trimmed(40, 1500, "About your work"),
    yearsExperience: z.number().int().min(0).max(80),
    categoryIds: z
      .array(z.uuid())
      .min(1, "Choose at least one trade")
      .max(5, "Choose up to 5 trades"),
    primaryCategoryId: z.uuid(),
    areaLabel: trimmed(2, 80, "Area"),
    city: trimmed(2, 60, "City"),
    state: trimmed(2, 60, "State"),
    lat,
    lng,
    serviceRadiusKm: z.number().int().min(1).max(200),
    calloutMinKobo: z.number().int().min(0).max(100_000_000).nullable(),
    calloutMaxKobo: z.number().int().min(0).max(100_000_000).nullable(),
    whatsappNumber: z.string().trim().max(20).optional(),
  })
  .refine((v) => v.categoryIds.includes(v.primaryCategoryId), {
    path: ["primaryCategoryId"],
    message: "Your main trade must be one of your selected trades",
  })
  .refine(
    (v) =>
      v.calloutMinKobo == null || v.calloutMaxKobo == null || v.calloutMinKobo <= v.calloutMaxKobo,
    { path: ["calloutMaxKobo"], message: "Maximum must not be less than the minimum" },
  );

export const availabilitySchema = z.object({
  slots: z
    .array(
      z
        .object({
          dayOfWeek: z.number().int().min(0).max(6),
          startMinute: z.number().int().min(0).max(1439),
          endMinute: z.number().int().min(1).max(1440),
        })
        .refine((s) => s.endMinute > s.startMinute, {
          message: "End time must be after start time",
        }),
    )
    .max(28),
});

export const availableNowSchema = z.object({
  available: z.boolean(),
  hours: z.number().int().min(1).max(12).default(4),
});

export const portfolioAddSchema = z.object({
  storageKey: z.string().max(200),
  caption: optionalText(140),
  categoryId: z.uuid().optional(),
});

export const verificationSubmitSchema = z.object({
  idType: z.enum(["NIN", "DRIVERS_LICENCE", "VOTERS_CARD", "INTERNATIONAL_PASSPORT"]),
  documentNumber: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, "").toUpperCase())
    .pipe(
      z.string().regex(/^[A-Z0-9]{6,20}$/, "Enter the number exactly as printed on the document"),
    ),
  documentKey: z.string().max(200),
  selfieKey: z.string().max(200).optional(),
});

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateRequestInput = z.input<typeof createRequestSchema>;
export type ArtisanProfileInput = z.infer<typeof artisanProfileSchema>;
