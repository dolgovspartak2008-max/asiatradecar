import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { getSitemapCars } from "@/server/catalog";
import { buildSitemapEntries } from "@/domain/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemapEntries(site.url, await getSitemapCars());
}
