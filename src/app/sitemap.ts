import { type MetadataRoute } from "next";
import { db } from "@/server/db/client";

export const dynamic = "force-dynamic";
const base = process.env.APP_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/search", "/how-trust-works", "/artisan", "/help", "/terms", "/privacy"].map(
    (path) => ({ url: `${base}${path}`, changeFrequency: "weekly" as const }),
  );
  const artisans = await db.artisanProfile
    .findMany({
      where: { status: "ACTIVE", deletedAt: null },
      select: { id: true, updatedAt: true },
      orderBy: { trustScore: "desc" },
      take: 5000,
    })
    .catch(() => []);
  return [
    ...pages,
    ...artisans.map((a) => ({
      url: `${base}/artisans/${a.id}`,
      lastModified: a.updatedAt,
      changeFrequency: "daily" as const,
    })),
  ];
}
