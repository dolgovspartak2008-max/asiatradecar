import type { MetadataRoute } from "next";
import { site, siteIndexable } from "@/config/site";
export default function robots(): MetadataRoute.Robots {
  if (!siteIndexable) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return { rules: [
    { userAgent: "*", allow: "/", disallow: "/api/" },
    { userAgent: "ElevenLabsCrawler", disallow: "/" },
    { userAgent: "SERankingBacklinksBot", disallow: "/" }
  ], sitemap: `${site.url}/sitemap.xml`, host: site.url };
}
