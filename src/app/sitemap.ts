import type { MetadataRoute } from "next";
import { site } from "@/config/site";
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["", "/catalog?country=kr", "/calculator", "/legal/privacy", "/legal/consent", "/legal/legal-information"].map((path) => ({ url: `${site.url}${path}`, lastModified: now, changeFrequency: path.includes("catalog") ? "daily" as const : "monthly" as const, priority: path === "" ? 1 : path.includes("catalog") ? .9 : .6 }));
}
