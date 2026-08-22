"use client";

import { useRef } from "react";
import type { CatalogFilters as Filters } from "@/domain/catalog";

export function CatalogFilters({ filters, makes, models }: { filters: Filters; makes: string[]; models: string[] }) {
  const form = useRef<HTMLFormElement>(null);
  return <form ref={form} className="catalog-filters">
    <label>Марка<select name="make" value={filters.make || ""} onChange={(event) => { const model = form.current?.elements.namedItem("model") as HTMLSelectElement | null; if (model) model.value = ""; event.currentTarget.form?.requestSubmit(); }}><option value="">Все марки</option>{makes.map((make) => <option key={make}>{make}</option>)}</select></label>
    <label>Модель<select name="model" defaultValue={filters.model || ""} disabled={!filters.make}><option value="">{filters.make ? "Все модели" : "Сначала выберите марку"}</option>{models.map((model) => <option key={model}>{model}</option>)}</select></label>
    <label>Год от<input name="yearFrom" type="number" min="1990" max="2030" defaultValue={filters.yearFrom} /></label>
    <label>Цена до, ₽<input name="priceTo" type="number" min="0" step="100000" defaultValue={filters.priceTo} /></label>
    <label>Пробег до, км<input name="mileageTo" type="number" min="0" step="10000" defaultValue={filters.mileageTo} /></label>
    <label>Сортировка<select name="sort" defaultValue={filters.sort}><option value="newest">Сначала новее</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option><option value="mileage">Меньше пробег</option></select></label>
    <input type="hidden" name="country" value={filters.country} /><button className="button" type="submit">Показать</button>
  </form>;
}
