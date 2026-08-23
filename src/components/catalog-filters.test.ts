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
    expect(source).toContain("requestSubmit()");
  });

  it("shows separate year-from and year-to controls", () => {
    const source = readFileSync(new URL("./catalog-filters.tsx", import.meta.url), "utf8");
    expect(source).toContain('<label>Год от<input name="yearFrom" type="number"');
    expect(source).toContain('<label>Год до<input name="yearTo" type="number"');
    expect(source).not.toContain('<input name="yearTo" type="hidden"');
  });
});
