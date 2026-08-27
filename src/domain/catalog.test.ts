import { describe, expect, it } from "vitest";
import { buildCatalogQuery, parseCatalogParams } from "./catalog";

describe("catalog URL state", () => {
  it("ignores empty numeric query values", () => {
    const filters = parseCatalogParams({ yearFrom: "", yearTo: "", priceTo: "", mileageTo: "" });
    expect(filters.yearFrom).toBeUndefined();
    expect(filters.yearTo).toBeUndefined();
    expect(filters.priceTo).toBeUndefined();
    expect(filters.mileageTo).toBeUndefined();
  });

  it("parses filters and clamps page size", () => {
    const filters = parseCatalogParams({ q: "Kia K5", country: "kr", yearFrom: "2021", limit: "500", sort: "mileage" });
    expect(filters).toMatchObject({ q: "Kia K5", country: "kr", yearFrom: 2021, limit: 24, sort: "mileage" });
  });

  it("normalizes fractional page and limit values to integers", () => {
    expect(parseCatalogParams({ page: "2.8", limit: "5.9" })).toMatchObject({ limit: 5, offset: 5 });
  });

  it("keeps untrusted text in SQL parameters", () => {
    const query = buildCatalogQuery(parseCatalogParams({ q: "%' OR 1=1 --", make: "Kia" }));
    expect(query.text).not.toContain("OR 1=1");
    expect(query.values).toContain("%' OR 1=1 --");
  });

  it("includes completed Japanese auction lots without exposing inactive cars from other catalogs", () => {
    expect(buildCatalogQuery(parseCatalogParams({ country: "jp" })).text).toContain("status IN ('active', 'inactive')");
    expect(buildCatalogQuery(parseCatalogParams({ country: "jp" })).text).toContain("details->>'catalogSection' = 'archive'");
    expect(buildCatalogQuery(parseCatalogParams({ country: "kr" })).text).toContain("status = 'active'");
  });

  it("keeps unknown prices at the end for both price sorts", () => {
    expect(buildCatalogQuery(parseCatalogParams({ sort: "price-asc" })).text).toContain("price_rub ASC NULLS LAST");
    expect(buildCatalogQuery(parseCatalogParams({ sort: "price-desc" })).text).toContain("price_rub DESC NULLS LAST");
  });

  it("prioritizes database cars with a price and photo before the selected sort", () => {
    const sql = buildCatalogQuery(parseCatalogParams({ sort: "newest" })).text;
    expect(sql).toContain("ORDER BY (price_rub IS NULL OR price_rub <= 0) ASC");
    expect(sql).toContain("(jsonb_array_length(photos) = 0) ASC");
  });

  it("deduplicates normalized VINs before database pagination", () => {
    const sql = buildCatalogQuery(parseCatalogParams({ country: "jp" })).text;
    expect(sql).toContain("SELECT DISTINCT ON");
    expect(sql).toContain("regexp_replace(upper(vin)");
    expect(sql.indexOf("SELECT DISTINCT ON")).toBeLessThan(sql.indexOf("LIMIT"));
  });
});
