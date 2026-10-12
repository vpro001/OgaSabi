import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { categories } from "./categories";
import { DEV_PASSWORD, seedDemo } from "./demo";

// Usage:
//   npm run db:seed                 reference data + demo data (development only)
//   npm run db:seed:reference       reference data only (safe in production)
//   npm run db:seed -- --reset      wipe demo data first, then reseed
//   ALLOW_DEMO_SEED=true            required to load demo data when NODE_ENV=production
const args = new Set(process.argv.slice(2));
const referenceOnly = args.has("--reference-only");
const reset = args.has("--reset");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  try {
    console.log("Seeding reference data (categories)…");
    for (const [i, c] of categories.entries()) {
      await db.category.upsert({
        where: { slug: c.slug },
        create: { ...c, sortOrder: i },
        update: { name: c.name, description: c.description, iconKey: c.iconKey, sortOrder: i },
      });
    }
    console.log(`  ${categories.length} categories`);

    if (referenceOnly) return;

    if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
      console.log(
        "Skipping demo data: NODE_ENV=production (set ALLOW_DEMO_SEED=true to override).",
      );
      return;
    }

    if (reset) {
      console.log("Resetting demo data…");
      await db.$executeRawUnsafe(
        `TRUNCATE TABLE "users", "refresh_tokens", "otp_codes", "device_tokens", "artisan_profiles", "artisan_categories",
         "availability_slots", "portfolio_photos", "identity_verifications", "favorites", "service_requests", "request_photos",
         "request_events", "quotes", "messages", "reviews", "complaints", "disputes", "evidence_files", "reports",
         "trust_score_snapshots", "notifications", "notification_deliveries", "notification_preferences", "payments",
         "webhook_events", "audit_logs", "idempotency_keys" RESTART IDENTITY CASCADE`,
      );
    } else if ((await db.user.count()) > 0) {
      console.log("Users already exist; skipping demo data. Re-run with --reset to replace it.");
      return;
    }

    console.log("Seeding demo data…");
    await seedDemo(db);
    console.log(`\nDone. Every demo account uses the password: ${DEV_PASSWORD}`);
    console.log(
      "  admin@ogasabi.test · adaeze.nwankwo@ogasabi.test (customer) · ibifuro.briggs@ogasabi.test (artisan)",
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
