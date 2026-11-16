import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed/index.ts",
  },
  datasource: {
    // Read leniently: `prisma generate` runs at build time (Vercel, Docker), where there may be no
    // database URL yet and none is needed. Commands that do connect fail with their own message.
    url: process.env.DATABASE_URL ?? "",
  },
});
