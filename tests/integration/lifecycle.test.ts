import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, disconnectDb } from "@/server/db/client";
import { register } from "@/server/services/auth";
import { saveOwnProfile, searchArtisans } from "@/server/services/artisans";
import {
  createRequest,
  createReview,
  getRequest,
  performAction,
  sendMessage,
} from "@/server/services/requests";
import { recomputeTrust } from "@/server/trust/engine";
import { type SessionUser } from "@/server/auth/session";
import { AppError } from "@/server/http/errors";
import { createRequestSchema, reviewSchema } from "@/lib/schemas";

// Walks one job through the whole lifecycle against the real database.
const tag = `it${Date.now()}`;
let customer: SessionUser;
let artisan: SessionUser;
let artisanId: string;
let categoryId: string;
let requestId: string;

async function makeUser(first: string): Promise<SessionUser> {
  const email = `${first.toLowerCase()}.${tag}@ogasabi.test`;
  const u = await register({
    firstName: first,
    lastName: "Tester",
    email,
    phone: undefined,
    password: "Passw0rd!x",
    acceptTerms: true,
  });
  return {
    id: u.id,
    roles: u.roles,
    familyId: crypto.randomUUID(),
    firstName: first,
    lastName: "Tester",
    email,
    phone: null,
    artisanId: null,
  };
}

beforeAll(async () => {
  categoryId = (await db.category.findFirstOrThrow({ where: { slug: "plumber" } })).id;
  customer = await makeUser("Chioma");
  artisan = await makeUser("Emeka");
  const profile = await saveOwnProfile(artisan.id, {
    businessName: `Emeka Pipes ${tag}`,
    bio: "Leaks, blocked drains and pumping machines fixed properly the first time.",
    yearsExperience: 6,
    categoryIds: [categoryId],
    primaryCategoryId: categoryId,
    areaLabel: "Independence Layout",
    city: "Enugu",
    state: "Enugu",
    lat: 6.4403,
    lng: 7.5148,
    serviceRadiusKm: 10,
    calloutMinKobo: 300_000,
    calloutMaxKobo: 800_000,
    whatsappNumber: "08031234567",
  });
  artisanId = profile!.id;
  artisan = { ...artisan, artisanId, roles: ["CUSTOMER", "ARTISAN"] };
});

afterAll(async () => {
  // request_events and audit_logs are append-only, so test rows are left in place by design.
  await disconnectDb();
});

const input = (over: Record<string, unknown> = {}) =>
  createRequestSchema.parse({
    artisanId,
    categoryId,
    description: "Kitchen sink is leaking under the cabinet.",
    addressLine: "14 Test Close",
    areaLabel: "Independence Layout",
    city: "Enugu",
    state: "Enugu",
    lat: 6.4451,
    lng: 7.5101,
    isImmediate: true,
    photoKeys: [],
    ...over,
  });

describe("a job from request to review", () => {
  it("finds the new artisan in a nearby search with a distance", async () => {
    const res = await searchArtisans({
      lat: 6.4451,
      lng: 7.5101,
      radiusKm: 5,
      sort: "distance",
      limit: 10,
      offset: 0,
      q: tag,
    });
    expect(res.artisans.map((a) => a.id)).toContain(artisanId);
    expect(res.artisans[0]?.distanceKm).toBeLessThan(2);
  });

  it("rejects an address outside the service area", async () => {
    await expect(
      createRequest(customer, input({ lat: 9.0765, lng: 7.3986 }), null),
    ).rejects.toMatchObject({ code: "OUTSIDE_SERVICE_AREA" });
  });

  it("creates the request once for a repeated idempotency key", async () => {
    const a = await createRequest(customer, input(), "key-1");
    const b = await createRequest(customer, input(), "key-1");
    expect(b.id).toBe(a.id);
    requestId = a.id;
    await expect(createRequest(customer, input(), "key-2")).rejects.toMatchObject({
      code: "DUPLICATE_REQUEST",
    });
  });

  it("hides the address and phone numbers from the artisan until acceptance", async () => {
    const seen = await getRequest(artisan, requestId);
    expect(seen.addressLine).toBeNull();
    expect(seen.customer.phone).toBeNull();
    expect(seen.customer.name).toBe("Chioma T.");
    expect(seen.distanceKm! % 0.5).toBe(0);
    const mine = await getRequest(customer, requestId);
    expect(mine.addressLine).toBe("14 Test Close");
    expect(mine.artisan.whatsappNumber).toBeNull();
  });

  it("is invisible to anyone else", async () => {
    const stranger = await makeUser("Nosa");
    await expect(getRequest(stranger, requestId)).rejects.toMatchObject({ status: 404 });
  });

  it("refuses moves by the wrong party", async () => {
    await expect(performAction(customer, requestId, { action: "accept" })).rejects.toBeInstanceOf(
      AppError,
    );
    await expect(performAction(artisan, requestId, { action: "confirm" })).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
  });

  it("goes quote → accept → start → complete → confirm", async () => {
    let r = await performAction(artisan, requestId, {
      action: "quote",
      amountKobo: 1_200_000,
      note: "Labour and a new trap",
    });
    expect(r.status).toBe("QUOTED");
    await sendMessage(customer, requestId, "Can you come before noon?");
    r = await performAction(customer, requestId, { action: "accept_quote" });
    expect(r.status).toBe("ACCEPTED");
    expect(r.artisan.whatsappNumber).toBe("+2348031234567");
    const seen = await getRequest(artisan, requestId);
    expect(seen.addressLine).toBe("14 Test Close");
    expect(seen.unreadMessages).toBe(1);

    await performAction(artisan, requestId, { action: "start" });
    r = await performAction(artisan, requestId, { action: "mark_complete" });
    expect(r.status).toBe("AWAITING_CONFIRMATION");
    expect(r.finalAmountKobo).toBe(1_200_000);
    r = await performAction(customer, requestId, { action: "confirm" });
    expect(r.status).toBe("COMPLETED");
    expect(r.canReview).toBe(true);
    expect(r.events.map((e) => e.type)).toEqual([
      "CREATED",
      "QUOTED",
      "QUOTE_ACCEPTED",
      "STARTED",
      "MARKED_COMPLETE",
      "CONFIRMED_COMPLETE",
    ]);
  });

  it("accepts exactly one review and feeds it into the trust score", async () => {
    await createReview(customer, requestId, {
      rating: 5,
      tags: ["PUNCTUAL"],
      comment: "Fixed in an hour.",
    });
    await expect(
      createReview(customer, requestId, reviewSchema.parse({ rating: 1 })),
    ).rejects.toMatchObject({
      code: "ALREADY_REVIEWED",
    });
    const result = await recomputeTrust(artisanId, "MANUAL");
    expect(result?.ratingCount).toBe(1);
    expect(result?.isProvisional).toBe(true);
    const row = await db.artisanProfile.findUniqueOrThrow({ where: { id: artisanId } });
    expect(row.completedJobsCount).toBe(1);
    expect(row.trustScore).toBe(result?.score);
  });

  it("notified both sides along the way", async () => {
    const [forArtisan, forCustomer] = await Promise.all([
      db.notification.count({ where: { userId: artisan.id } }),
      db.notification.count({ where: { userId: customer.id } }),
    ]);
    expect(forArtisan).toBeGreaterThanOrEqual(4);
    expect(forCustomer).toBeGreaterThanOrEqual(3);
  });
});
