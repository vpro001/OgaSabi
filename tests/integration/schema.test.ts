import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient, RequestEventType, ActorType } from "@/generated/prisma/client";

// Runs against a migrated database (TEST_DATABASE_URL, falling back to DATABASE_URL).
// In CI: `prisma migrate deploy` then `npm run db:seed` before this suite.
const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

beforeAll(() => {
  if (!url) throw new Error("Set TEST_DATABASE_URL or DATABASE_URL to run integration tests.");
});
afterAll(() => db.$disconnect());

describe("migrations", () => {
  it("created the PostGIS geography column and GiST index", async () => {
    const rows = await db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pg_indexes WHERE indexname = 'artisan_profiles_location_gist_idx'`;
    expect(rows[0]?.n).toBe(1);
  });

  it("finds artisans within 5 km of Rumuola, Port Harcourt using PostGIS", async () => {
    const rows = await db.$queryRaw<{ businessName: string }[]>`
      SELECT "businessName" FROM artisan_profiles
      WHERE location IS NOT NULL
        AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(7.0231, 4.8277), 4326)::geography, 5000)`;
    expect(rows.map((r) => r.businessName)).toContain("Briggs Electrical Works");
    expect(rows.map((r) => r.businessName)).not.toContain("BA Power Solutions"); // Lagos
  });
});

describe("integrity rules", () => {
  it("rejects a rating outside 1..5", async () => {
    const review = await db.review.findFirstOrThrow();
    await expect(
      db.$executeRaw`UPDATE reviews SET rating = 6 WHERE id = ${review.id}::uuid`,
    ).rejects.toThrow();
  });

  it("rejects an inverted callout price range", async () => {
    const p = await db.artisanProfile.findFirstOrThrow();
    await expect(
      db.$executeRaw`UPDATE artisan_profiles SET "calloutMinKobo" = 900, "calloutMaxKobo" = 100 WHERE id = ${p.id}::uuid`,
    ).rejects.toThrow();
  });

  it("keeps request_events append-only", async () => {
    const ev = await db.requestEvent.findFirstOrThrow();
    await expect(
      db.requestEvent.update({ where: { id: ev.id }, data: { actorRole: ActorType.ADMIN } }),
    ).rejects.toThrow(/append-only/);
    await expect(db.requestEvent.delete({ where: { id: ev.id } })).rejects.toThrow(/append-only/);
  });

  it("allows only one review per request", async () => {
    const r = await db.review.findFirstOrThrow();
    await expect(
      db.review.create({
        data: { requestId: r.requestId, authorId: r.authorId, artisanId: r.artisanId, rating: 5 },
      }),
    ).rejects.toThrow();
  });

  it("allows only one live dispute per request", async () => {
    const d = await db.dispute.findFirstOrThrow({ where: { status: "OPEN" } });
    await expect(
      db.dispute.create({
        data: {
          requestId: d.requestId,
          openedById: d.openedById,
          openedByRole: ActorType.CUSTOMER,
          reason: "x",
          description: "y",
        },
      }),
    ).rejects.toThrow();
  });
});

describe("seed data", () => {
  it("has a request in every status", async () => {
    const groups = await db.serviceRequest.groupBy({ by: ["status"], _count: true });
    expect(groups.map((g) => g.status).sort()).toEqual([
      "ACCEPTED",
      "AWAITING_CONFIRMATION",
      "CANCELLED",
      "COMPLETED",
      "DECLINED",
      "DISPUTED",
      "EN_ROUTE",
      "EXPIRED",
      "IN_PROGRESS",
      "PENDING",
      "QUOTED",
    ]);
  });

  it("has events for every completed request starting with CREATED", async () => {
    const orphan = await db.serviceRequest.count({
      where: { status: "COMPLETED", events: { none: { type: RequestEventType.CREATED } } },
    });
    expect(orphan).toBe(0);
  });
});
