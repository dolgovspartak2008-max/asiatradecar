import { permanentRedirect } from "next/navigation";
import { buildCatalogHref, catalogMarkets } from "@/domain/seo";

export default async function CatalogRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const country = Array.isArray(raw.country) ? raw.country[0] : raw.country;
  const market = catalogMarkets.find((item) => item.country === country) || catalogMarkets[0];
  const query = new URLSearchParams();
  Object.entries(raw).forEach(([key, value]) => { if (key !== "country") (Array.isArray(value) ? value : [value]).forEach((item) => { if (item !== undefined) query.append(key, item); }); });
  const page = Number(query.get("page")) || 1;
  permanentRedirect(buildCatalogHref(market.slug, query.toString(), page));
}
