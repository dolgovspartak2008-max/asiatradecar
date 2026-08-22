import type { Metadata } from "next";
import Link from "next/link";
import { parseCatalogParams } from "@/domain/catalog";
import { getCatalog } from "@/server/catalog";
import { CatalogResults } from "@/components/catalog-results";
import { CatalogFilters } from "@/components/catalog-filters";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Каталог автомобилей", description: "Актуальные автомобили из Южной Кореи, Японии и Китая с расчётом стоимости под ключ в РФ.", alternates: { canonical: "/catalog" } };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams; const filters = parseCatalogParams(raw);
  const result = await getCatalog(filters).then((data) => ({ data, sourceError: false })).catch(() => ({ data: { cars: [], total: 0, makes: [], models: [], generations: [] }, sourceError: true }));
  const { data: { cars, total, makes, models, generations }, sourceError } = result;
  const page = Math.floor(filters.offset / filters.limit) + 1;
  const query = new URLSearchParams();
  Object.entries(raw).forEach(([key, value]) => (Array.isArray(value) ? value : [value]).forEach((item) => { if (item !== undefined) query.append(key, item); }));
  if (!query.has("country")) query.set("country", "kr");
  const countryName = { kr: "Южная Корея", jp: "Япония", cn: "Китай" }[filters.country] || "Автомобили";
  return <section className="page-section catalog-page"><div className="container"><div className="catalog-top"><div><p className="eyebrow">{countryName}</p><h1>Каталог автомобилей</h1><p>{sourceError ? "Live-источник временно не отвечает" : `${total.toLocaleString("ru-RU")} предложений в live-каталоге`}</p></div><Link className="button button-ghost" href="/catalog/favorites"><Icon name="heart" /> Избранное</Link></div>
    <CatalogFilters filters={filters} makes={makes} models={models} generations={generations} />
    {cars.length ? <CatalogResults key={query.toString()} initialCars={cars} total={total} initialPage={page} query={query.toString()} /> : <div className="empty-state"><Icon name="car" size={48}/><h2>{sourceError ? "Не удалось получить первую страницу" : "Автомобили не найдены"}</h2><p>{sourceError ? "Источник не ответил. Повторите загрузку — после первого успешного ответа страница останется в быстром кэше." : "Измените фильтры — каталог обновится автоматически."}</p><Link className="button" href={`/catalog?country=${filters.country}`}>{sourceError ? "Повторить загрузку" : "Сбросить фильтры"}</Link></div>}
  </div></section>;
}
