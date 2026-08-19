import type { Metadata } from "next";
import Link from "next/link";
import { parseCatalogParams } from "@/domain/catalog";
import { getCatalog } from "@/server/catalog";
import { CarCard } from "@/components/car-card";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Каталог автомобилей из Кореи", description: "Актуальные автомобили из Кореи: фильтры по марке, году, цене, пробегу и характеристикам.", alternates: { canonical: "/catalog?country=kr" } };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams; const filters = parseCatalogParams(raw); const { cars, total, makes } = await getCatalog(filters); const page = Math.floor(filters.offset / filters.limit) + 1; const pages = Math.ceil(total / filters.limit);
  return <section className="page-section"><div className="container"><div className="catalog-top"><div><p className="eyebrow">Южная Корея</p><h1>Каталог автомобилей</h1><p>{total ? `${total.toLocaleString("ru-RU")} актуальных предложений` : "Данные появляются только из подключённого разрешённого источника"}</p></div><Link className="button button-ghost" href="/catalog/favorites"><Icon name="heart" /> Избранное</Link></div>
    <form className="catalog-filters"><label className="search-field"><span>Поиск</span><div><Icon name="search" size={19}/><input name="q" defaultValue={filters.q} placeholder="Марка или модель" /></div></label><label>Марка<select name="make" defaultValue={filters.make || ""}><option value="">Все марки</option>{makes.map((make) => <option key={make}>{make}</option>)}</select></label><label>Год от<input name="yearFrom" type="number" min="1990" max="2030" defaultValue={filters.yearFrom} /></label><label>Цена до, ₽<input name="priceTo" type="number" min="0" step="100000" defaultValue={filters.priceTo} /></label><label>Пробег до, км<input name="mileageTo" type="number" min="0" step="10000" defaultValue={filters.mileageTo} /></label><label>Сортировка<select name="sort" defaultValue={filters.sort}><option value="newest">Сначала новее</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option><option value="mileage">Меньше пробег</option></select></label><input type="hidden" name="country" value="kr" /><button className="button" type="submit">Показать</button></form>
    {cars.length ? <><div className="catalog-grid">{cars.map((car) => <CarCard key={car.id} car={car} />)}</div>{pages > 1 && <nav className="pagination" aria-label="Страницы каталога">{page > 1 && <Link href={{ query: { ...raw, page: page - 1 } }}>Назад</Link>}<span>{page} / {pages}</span>{page < pages && <Link href={{ query: { ...raw, page: page + 1 } }}>Далее</Link>}</nav>}</> : <div className="empty-state"><Icon name="car" size={48}/><h2>Каталог пока не синхронизирован</h2><p>Мы не подставляем демонстрационные объявления. После подключения авторизованного фида здесь появятся актуальные автомобили, фото и цены.</p><Link className="button" href="/calculator">Рассчитать импорт вручную</Link></div>}
  </div></section>;
}
