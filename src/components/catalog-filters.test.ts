import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CatalogFilters", () => {
  it("preserves the selected country when filters submit", () => {
    const source = readFileSync(new URL("./catalog-filters.tsx", import.meta.url), "utf8");
    expect(source).toContain('name="country" value={filters.country}');
    expect(source).not.toContain('name="country" value="kr"');
  });
});
