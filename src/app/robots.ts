import { type MetadataRoute } from "next";

const base = process.env.APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/requests",
          "/settings",
          "/notifications",
          "/favorites",
          "/booking",
          "/artisan/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
