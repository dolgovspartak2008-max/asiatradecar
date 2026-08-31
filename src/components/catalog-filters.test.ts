import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CatalogFilters", () => {
  it("keeps country in the crawlable path instead of a duplicate query parameter", () => {
    const source = readFileSync(new URL("./catalog-filters.tsx", import.meta.url), "utf8");
    expect(source).not.toContain('name="country"');
  });

  it("does not render model generations", () => {
    const source = readFileSync(new URL("./catalog-filters.tsx", import.meta.url), "utf8");
    expect(source).not.toContain("generation");
    expect(source).not.toContain("Поколение");
  });

  it("shows separate year-from and year-to controls", () => {
    const source = readFileSync(new URL("./catalog-filters.tsx", import.meta.url), "utf8");
    expect(source).toContain('<label>Год от<input name="yearFrom" type="number"');
    expect(source).toContain('<label>Год до<input name="yearTo" type="number"');
    expect(source).not.toContain('<input name="yearTo" type="hidden"');
  });

  it("lets users type or choose a make and shows brand marks in the list", () => {
    const source = readFileSync(new URL("./catalog-filters.tsx", import.meta.url), "utf8");
    expect(source).toContain('type="search"');
    expect(source).toContain('aria-label="Поиск марки"');
    expect(source).toContain('className="brand-select-options"');
    expect(source).toContain('role="listbox"');
    expect(source).toContain("BrandMark");
    expect(source).not.toContain("<label>Марка<select");
  });

  it("keeps the make picker open when mobile blur has no related target", () => {
    const source = readFileSync(new URL("./catalog-filters.tsx", import.meta.url), "utf8");
    expect(source).toContain("event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)");
  });

  it("lets users search and choose a model in the same picker style", () => {
    const source = readFileSync(new URL("./catalog-filters.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    expect(source).toContain('aria-label="Поиск модели"');
    expect(source).toContain('aria-label="Модели автомобилей"');
    expect(source).toContain('className="brand-select-options model-select-options"');
    expect(source).toContain("Модель не найдена");
    expect(source).not.toContain("<label>Модель<select");
    expect(styles).toContain(".model-select-options button");
  });

  it("shows make marks on every Japanese and Chinese catalog card", () => {
    const card = readFileSync(new URL("./car-card.tsx", import.meta.url), "utf8");
    const mark = readFileSync(new URL("./brand-mark.tsx", import.meta.url), "utf8");
    expect(card).toContain("<BrandMark make={car.make} country={car.country}");
    expect(card).toContain('["jp", "cn"].includes(car.country)');
    expect(mark).toContain("brandLogoSource");
    expect(mark).toContain("trust-encar.ru/wp-content/uploads");
  });

  it("updates and resets filters without scrolling the catalog to the top", () => {
    const source = readFileSync(new URL("./catalog-filters.tsx", import.meta.url), "utf8");
    expect(source).toContain("router.replace");
    expect(source).toContain("{ scroll: false }");
    expect(source).not.toContain("sessionStorage");
    expect(source).not.toContain("window.scrollTo");
    expect(source).toContain("window.location.pathname");
    expect(source).toContain("window.location.search");
    expect(source).toContain("Сбросить все фильтры");
    expect(source).toContain("useTransition");
    expect(source).toContain("Секунду, загружаем автомобили");
    expect(source).toContain('aria-live="polite"');
    expect(source).not.toContain("document.activeElement");
    expect(source).not.toContain("requestSubmit()");
  });

  it("does not remount the filter panel during query updates", () => {
    const source = readFileSync(new URL("./catalog-page.tsx", import.meta.url), "utf8");
    expect(source).toContain("<CatalogFilters filters={filters}");
    expect(source).not.toContain("<CatalogFilters key=");
  });
});
