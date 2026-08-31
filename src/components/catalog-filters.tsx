"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CatalogFilters as Filters } from "@/domain/catalog";
import { BrandMark } from "@/components/brand-mark";

export function CatalogFilters({ filters, makes, models }: { filters: Filters; makes: string[]; models: string[] }) {
  const form = useRef<HTMLFormElement>(null);
  const makePicker = useRef<HTMLDetailsElement>(null);
  const modelPicker = useRef<HTMLDetailsElement>(null);
  const [makeSearch, setMakeSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const selectedMake = filters.make || "";
  const selectedModel = filters.model || "";
  const pathname = usePathname();
  const router = useRouter();
  const replaceWithoutScroll = (url: string) => {
    if (`${window.location.pathname}${window.location.search}` === url) return;
    startTransition(() => router.replace(url, { scroll: false }));
  };
  const applyFilters = (selectedForm: HTMLFormElement | null = form.current, overrides: Record<string, string> = {}) => {
    if (!selectedForm) return;
    const query = new URLSearchParams();
    new FormData(selectedForm).forEach((value, name) => {
      const text = String(value).trim();
      if (text && !(name === "sort" && text === "newest")) query.set(name, text);
    });
    Object.entries(overrides).forEach(([name, value]) => value ? query.set(name, value) : query.delete(name));
    replaceWithoutScroll(query.size ? `${pathname}?${query}` : pathname);
  };
  const resetFilters = () => {
    setMakeSearch("");
    setModelSearch("");
    form.current?.querySelectorAll<HTMLInputElement>("input").forEach((input) => { input.value = ""; });
    form.current?.querySelectorAll<HTMLSelectElement>("select").forEach((select) => { select.selectedIndex = 0; });
    replaceWithoutScroll(pathname);
  };
  const chooseMake = (make: string) => {
    setMakeSearch("");
    setModelSearch("");
    if (makePicker.current) makePicker.current.open = false;
    applyFilters(form.current, { make, model: "" });
  };
  const chooseModel = (model: string) => {
    setModelSearch("");
    if (modelPicker.current) modelPicker.current.open = false;
    applyFilters(form.current, { model });
  };
  const visibleMakes = makes.filter((make) => make.toLocaleLowerCase("ru-RU").includes(makeSearch.trim().toLocaleLowerCase("ru-RU")));
  const visibleModels = models.filter((model) => model.toLocaleLowerCase("ru-RU").includes(modelSearch.trim().toLocaleLowerCase("ru-RU")));
  return <form ref={form} className="catalog-filters" aria-busy={isPending} onSubmit={(event) => { event.preventDefault(); applyFilters(event.currentTarget); }}>
    <div className="brand-select-field"><span id="make-label">Марка</span><input name="make" type="hidden" value={selectedMake} readOnly /><details ref={makePicker} className="brand-select" onToggle={(event) => { if (event.currentTarget.open) setMakeSearch(""); }} onBlur={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}><summary aria-labelledby="make-label"><span>{selectedMake && <BrandMark make={selectedMake} country={filters.country} />}{selectedMake || "Все марки"}</span></summary><div className="brand-select-popover"><input type="search" value={makeSearch} onChange={(event) => setMakeSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape" && makePicker.current) makePicker.current.open = false; }} aria-label="Поиск марки" placeholder="Поиск" autoComplete="off" /><div className="brand-select-options" id="make-options" role="listbox" aria-label="Марки автомобилей"><button type="button" role="option" aria-selected={!selectedMake} onClick={() => chooseMake("")}><BrandMark make="" country="" /><span>Все марки</span></button>{visibleMakes.map((make) => <button type="button" role="option" aria-selected={selectedMake === make} onClick={() => chooseMake(make)} key={make}><BrandMark make={make} country={filters.country} /><span>{make}</span></button>)}{visibleMakes.length === 0 && <p>Марка не найдена</p>}</div></div></details></div>
    <div className="brand-select-field"><span id="model-label">Модель</span><input name="model" type="hidden" value={selectedModel} readOnly /><details ref={modelPicker} className={`brand-select${selectedMake ? "" : " is-disabled"}`} aria-disabled={!selectedMake} onToggle={(event) => { if (!selectedMake) { event.currentTarget.open = false; return; } if (event.currentTarget.open) setModelSearch(""); }} onBlur={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}><summary aria-labelledby="model-label" onClick={(event) => { if (!selectedMake) event.preventDefault(); }}><span>{selectedModel || (selectedMake ? "Все модели" : "Сначала выберите марку")}</span></summary><div className="brand-select-popover"><input type="search" value={modelSearch} onChange={(event) => setModelSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape" && modelPicker.current) modelPicker.current.open = false; }} aria-label="Поиск модели" placeholder="Поиск" autoComplete="off" /><div className="brand-select-options model-select-options" id="model-options" role="listbox" aria-label="Модели автомобилей"><button type="button" role="option" aria-selected={!selectedModel} onClick={() => chooseModel("")}><span>Все модели</span></button>{visibleModels.map((model) => <button type="button" role="option" aria-selected={selectedModel === model} onClick={() => chooseModel(model)} key={model}><span>{model}</span></button>)}{visibleModels.length === 0 && <p>Модель не найдена</p>}</div></div></details></div>
    <label>Год от<input name="yearFrom" type="number" min="1990" max="2030" defaultValue={filters.yearFrom} /></label>
    <label>Год до<input name="yearTo" type="number" min="1990" max="2030" defaultValue={filters.yearTo} /></label>
    <label>Цена до, ₽<input name="priceTo" type="number" min="0" step="100000" defaultValue={filters.priceTo} /></label>
    <label>Пробег до, км<input name="mileageTo" type="number" min="0" step="10000" defaultValue={filters.mileageTo} /></label>
    <label>Сортировка<select name="sort" defaultValue={filters.sort}><option value="newest">Сначала новее</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option><option value="mileage">Меньше пробег</option></select></label>
    <div className="catalog-filter-actions"><button className="button" type="submit" disabled={isPending}>{isPending ? "Загружаем…" : "Показать"}</button><button className="button button-ghost" type="button" onClick={resetFilters} disabled={isPending}>Сбросить все фильтры</button><p className="catalog-filter-status" aria-live="polite">{isPending ? "Секунду, загружаем автомобили…" : ""}</p></div>
  </form>;
}
