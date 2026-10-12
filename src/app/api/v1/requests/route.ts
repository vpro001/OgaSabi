import { type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/server/db/client";
import { ok, fail } from "@/server/http/response";

const requestSchema = z.object({
  artisanId: z.string().uuid(),
  problemDescription: z.string().min(10),
  issueTags: z.array(z.string()).optional(),
  locationDetails: z.string().optional(),
  accessNotes: z.string().optional(),
  isUrgent: z.boolean().optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  categoryId: z.string().uuid().optional(),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("BAD_REQUEST", "Invalid JSON body", 400);
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Validation failed", 400);
  }
  const input = parsed.data;

  try {
    const artisan = await db.artisanProfile.findUnique({
      where: { id: input.artisanId },
    });

    if (!artisan) {
      return fail("ARTISAN_NOT_FOUND", "Artisan not found", 404);
    }

    if (artisan.status !== "ACTIVE") {
      return fail("ARTISAN_UNAVAILABLE", "This artisan is currently unavailable", 403);
    }

    const feeKobo = Math.max(
      input.isUrgent ? 10_000_00 : 5_000_00,
      artisan.calloutMinKobo ?? 5_000_00,
    );

    const serviceRequest = await db.serviceRequest.create({
      data: {
        description: input.problemDescription,
        status: "PENDING",
        quotedAmountKobo: feeKobo,
        artisanId: artisan.id,
        // TODO: Replace with authenticated customer ID once auth is added
        customerId: "00000000-0000-0000-0000-000000000000",
        version: 1,
        categoryId: input.categoryId ?? "00000000-0000-0000-0000-000000000000",
        addressLine: input.locationDetails ?? "Unknown",
        areaLabel: "Pending",
        city: "Lagos",
        state: "Lagos",
        lat: 0,
        lng: 0,
        isImmediate: input.isUrgent ?? false,
        scheduledFor: input.scheduledAt ? new Date(input.scheduledAt) : null,
      },
    });

    await db.requestEvent.create({
      data: {
        requestId: serviceRequest.id,
        type: "CREATED",
        actorRole: "CUSTOMER",
        metadata: {
          problemDescription: input.problemDescription,
          issueTags: input.issueTags ?? [],
          isUrgent: input.isUrgent ?? false,
          feeKobo,
        } as never,
      },
    });

    return ok(
      {
        requestId: serviceRequest.id,
        status: serviceRequest.status,
        quotedAmountKobo: feeKobo,
        artisan: {
          id: artisan.id,
          businessName: artisan.businessName,
          trustScore: artisan.trustScore,
          trustTier: artisan.trustTier,
        },
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create request";
    return fail("INTERNAL_ERROR", message, 500);
  }
}
