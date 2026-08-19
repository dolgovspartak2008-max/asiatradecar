import type { MetadataRoute } from "next";
import { launchReady, site } from "@/config/site";
export default function robots(): MetadataRoute.Robots {
  if (!launchReady) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/catalog/favorites"] }], sitemap: `${site.url}/sitemap.xml`, host: site.url };
}
