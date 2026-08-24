"use client";

import { useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CatalogFilters as Filters } from "@/domain/catalog";
import type { TrustEncarGeneration } from "@/domain/sync";

export function CatalogFilters({ filters, makes, models, generations = [] }: { filters: Filters; makes: string[]; models: string[]; generations?: TrustEncarGeneration[] }) {
  const form = useRef<HTMLFormElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const filterSignature = JSON.stringify(filters);
  useEffect(() => {
    const stored = Number(sessionStorage.getItem("catalog-scroll-y"));
    if (!Number.isFinite(stored) || stored < 0) return;
    const restore = () => {
      const previous = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, stored);
      document.documentElement.style.scrollBehavior = previous;
    };
    const frame = requestAnimationFrame(restore);
    const finalRestore = window.setTimeout(() => {
      restore();
      sessionStorage.removeItem("catalog-scroll-y");
    }, 750);
    return () => { cancelAnimationFrame(frame); clearTimeout(finalRestore); };
  }, [filterSignature, pathname]);
  const replaceWithoutScroll = (url: string) => {
    sessionStorage.setItem("catalog-scroll-y", String(window.scrollY));
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    startTransition(() => router.replace(url, { scroll: false }));
  };
  const applyFilters = (selectedForm: HTMLFormElement | null = form.current) => {
    if (!selectedForm) return;
    const query = new URLSearchParams();
    new FormData(selectedForm).forEach((value, name) => {
      const text = String(value).trim();
      if (text && !(name === "sort" && text === "newest")) query.set(name, text);
    });
    replaceWithoutScroll(query.size ? `${pathname}?${query}` : pathname);
  };
  const submitSelectedValue = (selectedForm: HTMLFormElement | null) => queueMicrotask(() => applyFilters(selectedForm));
  const resetFilters = () => {
    form.current?.querySelectorAll<HTMLInputElement>("input").forEach((input) => { input.value = ""; });
    form.current?.querySelectorAll<HTMLSelectElement>("select").forEach((select) => { select.selectedIndex = 0; });
    replaceWithoutScroll(pathname);
  };
  const chooseGeneration = (generation: TrustEncarGeneration) => {
    const yearFrom = form.current?.elements.namedItem("yearFrom") as HTMLInputElement | null;
    const yearTo = form.current?.elements.namedItem("yearTo") as HTMLInputElement | null;
    if (yearFrom && yearTo) { yearFrom.value = String(generation.minYear); yearTo.value = String(generation.maxYear); applyFilters(); }
  };
  return <form ref={form} className="catalog-filters" onSubmit={(event) => { event.preventDefault(); applyFilters(event.currentTarget); }}>
    <label>Марка<select name="make" defaultValue={filters.make || ""} onChange={(event) => { const model = form.current?.elements.namedItem("model") as HTMLSelectElement | null; if (model) model.value = ""; submitSelectedValue(event.currentTarget.form); }}><option value="">Все марки</option>{makes.map((make) => <option key={make}>{make}</option>)}</select></label>
    <label>Модель<select name="model" defaultValue={filters.model || ""} disabled={!filters.make} onChange={(event) => submitSelectedValue(event.currentTarget.form)}><option value="">{filters.make ? "Все модели" : "Сначала выберите марку"}</option>{models.map((model) => <option key={model}>{model}</option>)}</select></label>
    <label>Год от<input name="yearFrom" type="number" min="1990" max="2030" defaultValue={filters.yearFrom} /></label>
    <label>Год до<input name="yearTo" type="number" min="1990" max="2030" defaultValue={filters.yearTo} /></label>
    <label>Цена до, ₽<input name="priceTo" type="number" min="0" step="100000" defaultValue={filters.priceTo} /></label>
    <label>Пробег до, км<input name="mileageTo" type="number" min="0" step="10000" defaultValue={filters.mileageTo} /></label>
    <label>Сортировка<select name="sort" defaultValue={filters.sort}><option value="newest">Сначала новее</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option><option value="mileage">Меньше пробег</option></select></label>
    <div className="catalog-filter-actions"><button className="button" type="submit">Показать</button><button className="button button-ghost" type="button" onClick={resetFilters}>Сбросить все фильтры</button></div>
    {generations.length > 0 && <fieldset className="generation-buttons"><legend>Поколение</legend><div>{generations.map((generation) => <button className={filters.yearFrom === generation.minYear && filters.yearTo === generation.maxYear ? "active" : ""} type="button" onClick={() => chooseGeneration(generation)} key={generation.name}>{generation.minYear}–{generation.maxYear}</button>)}</div></fieldset>}
  </form>;
}
