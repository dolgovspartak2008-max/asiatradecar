import type { Metadata } from "next";
import Link from "next/link";
import { parseCatalogParams } from "@/domain/catalog";
import { getCatalog } from "@/server/catalog";
import { CatalogResults } from "@/components/catalog-results";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Каталог автомобилей из Кореи", description: "Актуальные автомобили из Кореи: фильтры по марке, году, цене, пробегу и характеристикам.", alternates: { canonical: "/catalog?country=kr" } };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams; const filters = parseCatalogParams(raw);
  const result = await getCatalog(filters).then((data) => ({ data, sourceError: false })).catch(() => ({ data: { cars: [], total: 0, makes: [] }, sourceError: true }));
  const { data: { cars, total, makes }, sourceError } = result;
  const page = Math.floor(filters.offset / filters.limit) + 1;
  const query = new URLSearchParams();
  Object.entries(raw).forEach(([key, value]) => (Array.isArray(value) ? value : [value]).forEach((item) => { if (item !== undefined) query.append(key, item); }));
  if (!query.has("country")) query.set("country", "kr");
  return <section className="page-section"><div className="container"><div className="catalog-top"><div><p className="eyebrow">Южная Корея</p><h1>Каталог автомобилей</h1><p>{sourceError ? "Live-источник временно не отвечает" : `${total.toLocaleString("ru-RU")} предложений в live-каталоге`}</p></div><Link className="button button-ghost" href="/catalog/favorites"><Icon name="heart" /> Избранное</Link></div>
    <form className="catalog-filters"><label className="search-field"><span>Поиск</span><div><Icon name="search" size={19}/><input name="q" defaultValue={filters.q} placeholder="Марка или номер лота" /></div></label><label>Марка<select name="make" defaultValue={filters.make || ""}><option value="">Все марки</option>{makes.map((make) => <option key={make}>{make}</option>)}</select></label><label>Год от<input name="yearFrom" type="number" min="1990" max="2030" defaultValue={filters.yearFrom} /></label><label>Цена до, ₽<input name="priceTo" type="number" min="0" step="100000" defaultValue={filters.priceTo} /></label><label>Пробег до, км<input name="mileageTo" type="number" min="0" step="10000" defaultValue={filters.mileageTo} /></label><label>Сортировка<select name="sort" defaultValue={filters.sort}><option value="newest">Сначала новее</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option><option value="mileage">Меньше пробег</option></select></label><input type="hidden" name="country" value="kr" /><button className="button" type="submit">Показать</button></form>
    {cars.length ? <CatalogResults initialCars={cars} total={total} initialPage={page} query={query.toString()} /> : <div className="empty-state"><Icon name="car" size={48}/><h2>{sourceError ? "Не удалось получить первую страницу" : "Автомобили не найдены"}</h2><p>{sourceError ? "Источник не ответил. Повторите загрузку — после первого успешного ответа страница останется в быстром кэше." : "Измените фильтры — каталог обновится автоматически."}</p><Link className="button" href="/catalog?country=kr">{sourceError ? "Повторить загрузку" : "Сбросить фильтры"}</Link></div>}
  </div></section>;
}
