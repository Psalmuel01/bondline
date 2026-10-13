import type { MetadataRoute } from "next";
import { documentation } from "@/content/docs";
import { policyPages } from "@/content/policies";
import { siteUrl } from "@/lib/site";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    ...Object.keys(policyPages),
    "security",
    "guide",
    "docs",
    ...Object.keys(documentation).map((slug) => `docs/${slug}`),
  ].map((path) => ({
    url: `${siteUrl}/${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : path.startsWith("docs/") ? 0.6 : 0.8,
  }));
}
