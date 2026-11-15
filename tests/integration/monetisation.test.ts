import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Online deposits are switched on for this file only, with Paystack stubbed out below, and
// messages go to the mock providers so no real email or SMS leaves the machine.
vi.hoisted(() => {
  process.env.EMAIL_PROVIDER = "mock";
  process.env.SMS_PROVIDER = "mock";
  process.env.PAYMENTS_ENABLED = "true";
  process.env.PAYSTACK_SECRET_KEY = "sk_test_monetisation";
});

import { db, disconnectDb } from "@/server/db/client";
import { register } from "@/server/services/auth";
import { saveOwnProfile, searchArtisans } from "@/server/services/artisans";
import { handlePaystackWebhook, startDeposit } from "@/server/services/payments";
import { createRequest, getRequest, performAction } from "@/server/services/requests";
import {
  getPlatformSettings,
  monetisationOverview,
  setSponsorship,
  updatePlatformSettings,
} from "@/server/services/settings";
import { type SessionUser } from "@/server/auth/session";
import { createRequestSchema } from "@/lib/schemas";
import { type PlatformSettings } from "@/lib/fees";

const tag = `mon${Date.now()}`;
const meta = { ip: "127.0.0.1", userAgent: "vitest", requestId: tag };
const here = { lat: 6.4403, lng: 7.5148 };
let original: PlatformSettings;
let admin: SessionUser;
let customer: SessionUser;
let categoryId: string;
const artisans: { user: SessionUser; id: string; trustScore: number }[] = [];

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

const set = (over: Partial<PlatformSettings>) =>
  updatePlatformSettings(admin, { ...original, ...over }, meta);

const recommended = (sort: "recommended" | "trust" = "recommended") =>
  searchArtisans({ ...here, radiusKm: 5, sort, limit: 10, offset: 0, q: tag });

beforeAll(async () => {
  original = await getPlatformSettings();
  categoryId = (await db.category.findFirstOrThrow({ where: { slug: "plumber" } })).id;
  admin = { ...(await makeUser("Ada")), roles: ["CUSTOMER", "ADMIN"] };
  customer = await makeUser("Chioma");
  // Three artisans in the same spot, told apart only by trust score: 80, 60, 40.
  for (const [i, trustScore] of [80, 60, 40].entries()) {
    let user = await makeUser(`Artisan${i}`);
    const profile = await saveOwnProfile(user.id, {
      businessName: `Pipes ${trustScore} ${tag}`,
      bio: "Leaks, blocked drains and pumping machines fixed properly the first time.",
      yearsExperience: 6,
      categoryIds: [categoryId],
      primaryCategoryId: categoryId,
      areaLabel: "Independence Layout",
      city: "Enugu",
      state: "Enugu",
      ...here,
      serviceRadiusKm: 10,
      calloutMinKobo: 500_000,
      calloutMaxKobo: 800_000,
      whatsappNumber: "08031234567",
    });
    user = { ...user, artisanId: profile!.id, roles: ["CUSTOMER", "ARTISAN"] };
    artisans.push({ user, id: profile!.id, trustScore });
  }
  // Saving a profile recomputes its trust score in the background; let that land, then pin the
  // scores this file relies on.
  await new Promise((resolve) => setTimeout(resolve, 750));
  for (const a of artisans) {
    await db.artisanProfile.update({ where: { id: a.id }, data: { trustScore: a.trustScore } });
  }
});

afterAll(async () => {
  await db.platformSettings.update({ where: { id: 1 }, data: original });
  await db.payment.deleteMany({ where: { payerId: customer.id } });
  await db.artisanProfile.updateMany({
    where: { id: { in: artisans.map((a) => a.id) } },
    data: { sponsoredUntil: null },
  });
  vi.unstubAllGlobals();
  await disconnectDb();
});

describe("sponsored placement", () => {
  it("only accepts active, ID-verified artisans", async () => {
    await expect(setSponsorship(admin, artisans[2]!.id, 30, meta)).rejects.toMatchObject({
      status: 409,
    });
    await db.artisanProfile.updateMany({
      where: { id: { in: artisans.map((a) => a.id) } },
      data: { verificationLevel: "ID_VERIFIED" },
    });
    const { sponsoredUntil } = await setSponsorship(admin, artisans[2]!.id, 30, meta);
    expect(sponsoredUntil!.getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000);
  });

  it("changes nothing while the switch is off", async () => {
    await set({ sponsoredEnabled: false });
    const res = await recommended();
    expect(res.artisans.map((a) => a.trustScore)).toEqual([80, 60, 40]);
    expect(res.artisans.some((a) => a.isSponsored)).toBe(false);
  });

  it("leads the recommended order, labelled, once switched on", async () => {
    await set({ sponsoredEnabled: true, sponsoredSlots: 2 });
    const res = await recommended();
    expect(res.artisans.map((a) => a.trustScore)).toEqual([40, 80, 60]);
    expect(res.artisans.map((a) => a.isSponsored)).toEqual([true, false, false]);
    expect(res.total).toBe(3);
  });

  it("never touches an order the customer chose, or the trust score", async () => {
    const res = await recommended("trust");
    expect(res.artisans.map((a) => a.trustScore)).toEqual([80, 60, 40]);
    expect(res.artisans.some((a) => a.isSponsored)).toBe(false);
  });

  it("gives the limited places to the sponsored artisans who rank best anyway", async () => {
    await setSponsorship(admin, artisans[1]!.id, 7, meta);
    await set({ sponsoredEnabled: true, sponsoredSlots: 1 });
    const res = await recommended();
    expect(res.artisans.map((a) => a.trustScore)).toEqual([60, 80, 40]);
    expect(res.artisans.map((a) => a.isSponsored)).toEqual([true, false, false]);
  });

  it("stops when the sponsorship is ended", async () => {
    await setSponsorship(admin, artisans[1]!.id, 0, meta);
    await setSponsorship(admin, artisans[2]!.id, 0, meta);
    const res = await recommended();
    expect(res.artisans.map((a) => a.trustScore)).toEqual([80, 60, 40]);
    expect((await monetisationOverview()).sponsored.map((s) => s.id)).not.toContain(
      artisans[1]!.id,
    );
  });
});

describe("service fee on the callout deposit", () => {
  const charged: { amount: number; reference: string }[] = [];
  let requestId: string;

  const newAcceptedRequest = async (artisan: { user: SessionUser; id: string }) => {
    const r = await createRequest(
      customer,
      createRequestSchema.parse({
        artisanId: artisan.id,
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
      }),
      null,
    );
    await performAction(artisan.user, r.id, { action: "accept" });
    return r.id;
  };

  const webhook = (reference: string, amount: number) => {
    const body = JSON.stringify({
      event: "charge.success",
      data: { id: Date.now(), reference, amount, status: "success" },
    });
    const signature = createHmac("sha512", "sk_test_monetisation").update(body).digest("hex");
    return handlePaystackWebhook(body, signature);
  };

  beforeAll(() => {
    vi.stubGlobal("fetch", async (url: string, init: { body: string }) => {
      if (!String(url).startsWith("https://api.paystack.co/")) throw new Error(`unexpected ${url}`);
      const sent = JSON.parse(init.body) as { amount: number; reference: string };
      charged.push(sent);
      return Response.json({
        status: true,
        data: { authorization_url: `https://checkout.paystack.test/${sent.reference}` },
      });
    });
  });

  it("charges the bare deposit while the fee is off", async () => {
    await set({ serviceFeeEnabled: false, serviceFeeBps: 500 });
    requestId = await newAcceptedRequest(artisans[0]!);
    const seen = await getRequest(customer, requestId);
    expect(seen.calloutFeeKobo).toBe(500_000);
    expect(seen.payment).toMatchObject({ depositDue: true, serviceFeeKobo: 0 });
    await startDeposit(customer, requestId);
    expect(charged.at(-1)?.amount).toBe(500_000);
  });

  it("quotes and charges deposit plus fee once switched on", async () => {
    await set({ serviceFeeEnabled: true, serviceFeeBps: 500 });
    const seen = await getRequest(customer, requestId);
    expect(seen.payment).toMatchObject({ depositDue: true, serviceFeeKobo: 25_000 });
    await startDeposit(customer, requestId);
    const sent = charged.at(-1)!;
    expect(sent.amount).toBe(525_000);
    const payment = await db.payment.findUniqueOrThrow({ where: { reference: sent.reference } });
    expect(payment).toMatchObject({ amountKobo: 525_000, platformFeeKobo: 25_000 });
  });

  it("keeps the fee agreed at checkout even if the switch is flipped before payment lands", async () => {
    const before = (await monetisationOverview()).feesCollectedKobo;
    const sent = charged.at(-1)!;
    await set({ serviceFeeEnabled: false });
    await webhook(sent.reference, 525_000);
    const paid = await db.payment.findUniqueOrThrow({ where: { reference: sent.reference } });
    expect(paid.status).toBe("SUCCEEDED");
    const seen = await getRequest(customer, requestId);
    expect(seen.payment).toMatchObject({
      depositDue: false,
      depositPaid: true,
      serviceFeeKobo: 25_000,
    });
    expect((await monetisationOverview()).feesCollectedKobo).toBe(before + 25_000);
  });

  it("does not show the fee to the artisan as money owed by them", async () => {
    const seen = await getRequest(artisans[0]!.user, requestId);
    expect(seen.calloutFeeKobo).toBe(500_000);
    expect(seen.payment.depositDue).toBe(false);
  });

  it("writes every change to the audit log", async () => {
    const entries = await db.auditLog.count({
      where: { actorId: admin.id, action: "settings.monetisation.update" },
    });
    expect(entries).toBeGreaterThanOrEqual(5);
  });
});
