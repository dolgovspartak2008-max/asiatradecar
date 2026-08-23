import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogPageContent } from "@/components/catalog-page";
import { buildCatalogHref, getCatalogMarket, isFilteredCatalog } from "@/domain/seo";
import { parseCatalogParams } from "@/domain/catalog";

type Props = {
  params: Promise<{ market: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const market = getCatalogMarket((await params).market);
  if (!market) return { title: "Каталог не найден", robots: { index: false, follow: true } };
  const raw = await searchParams;
  const page = Math.floor(parseCatalogParams({ ...raw, country: market.country }).offset / 24) + 1;
  const filtered = isFilteredCatalog(raw);
  const canonical = buildCatalogHref(market.slug, "", page);
  const title = `${market.title}${page > 1 ? ` — страница ${page}` : ""}`;
  return {
    title,
    description: market.description,
    alternates: { canonical },
    robots: { index: !filtered, follow: true },
    openGraph: { type: "website", title, description: market.description, url: canonical, images: ["/media/hero-import.webp"] },
    twitter: { card: "summary_large_image", title, description: market.description, images: ["/media/hero-import.webp"] }
  };
}

export default async function CountryCatalogPage({ params, searchParams }: Props) {
  const market = getCatalogMarket((await params).market);
  if (!market) notFound();
  return <CatalogPageContent market={market} raw={await searchParams} />;
}
