import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CatalogFilters", () => {
  it("keeps country in the crawlable path instead of a duplicate query parameter", () => {
    const source = readFileSync(new URL("./catalog-filters.tsx", import.meta.url), "utf8");
    expect(source).not.toContain('name="country"');
  });

  it("renders model generations as inline year-range buttons", () => {
    const source = readFileSync(new URL("./catalog-filters.tsx", import.meta.url), "utf8");
    expect(source).toContain("generation-buttons");
    expect(source).toContain("generation.minYear");
    expect(source).toContain("generation.maxYear");
    expect(source).toContain("applyFilters(");
  });

  it("shows separate year-from and year-to controls", () => {
    const source = readFileSync(new URL("./catalog-filters.tsx", import.meta.url), "utf8");
    expect(source).toContain('<label>Год от<input name="yearFrom" type="number"');
    expect(source).toContain('<label>Год до<input name="yearTo" type="number"');
    expect(source).not.toContain('<input name="yearTo" type="hidden"');
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
    expect(source).not.toContain("useTransition");
    expect(source).not.toContain("document.activeElement");
    expect(source).not.toContain("requestSubmit()");
  });

  it("does not remount the filter panel during query updates", () => {
    const source = readFileSync(new URL("./catalog-page.tsx", import.meta.url), "utf8");
    expect(source).toContain("<CatalogFilters filters={filters}");
    expect(source).not.toContain("<CatalogFilters key=");
  });
});
