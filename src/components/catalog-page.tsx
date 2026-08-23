import Link from "next/link";
import { parseCatalogParams } from "@/domain/catalog";
import type { CatalogMarket } from "@/domain/seo";
import { getCatalog } from "@/server/catalog";
import { CatalogResults } from "@/components/catalog-results";
import { CatalogFilters } from "@/components/catalog-filters";
import { Icon } from "@/components/icons";

type SearchParams = Record<string, string | string[] | undefined>;

export async function CatalogPageContent({ market, raw }: { market: CatalogMarket; raw: SearchParams }) {
  const filters = parseCatalogParams({ ...raw, country: market.country });
  const result = await getCatalog(filters).then((data) => ({ data, sourceError: false })).catch(() => ({ data: { cars: [], total: 0, makes: [], models: [], generations: [] }, sourceError: true }));
  const { data: { cars, total, makes, models, generations }, sourceError } = result;
  const page = Math.floor(filters.offset / filters.limit) + 1;
  const query = new URLSearchParams();
  Object.entries(raw).forEach(([key, value]) => (Array.isArray(value) ? value : [value]).forEach((item) => { if (item !== undefined && key !== "country") query.append(key, item); }));
  query.set("country", market.country);
  return <section className="page-section catalog-page"><div className="container"><div className="catalog-top"><div><p className="eyebrow">{market.name}</p><h1>{market.title}</h1><p>{sourceError ? "Live-источник временно не отвечает" : `${total.toLocaleString("ru-RU")} предложений в live-каталоге`}</p></div><Link className="button button-ghost" href="/catalog/favorites"><Icon name="heart" /> Избранное</Link></div>
    <div className="catalog-intro"><p>{market.source}</p><p>Итоговые цена, наличие, сроки, маршрут, таможенные платежи и комплект документов подтверждаются после проверки выбранного автомобиля.</p></div>
    <CatalogFilters filters={filters} makes={makes} models={models} generations={generations} />
    {cars.length ? <CatalogResults key={query.toString()} initialCars={cars} total={total} initialPage={page} query={query.toString()} /> : <div className="empty-state"><Icon name="car" size={48}/><h2>{sourceError ? "Не удалось получить страницу" : "Автомобили не найдены"}</h2><p>{sourceError ? "Источник не ответил. Повторите загрузку позже." : "Измените фильтры — каталог обновится автоматически."}</p><Link className="button" href={`/catalog/${market.slug}`}>{sourceError ? "Повторить загрузку" : "Сбросить фильтры"}</Link></div>}
  </div></section>;
}
