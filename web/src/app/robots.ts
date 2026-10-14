import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/app/",
        "/profile",
        "/settings",
        "/journal",
        "/circle/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
