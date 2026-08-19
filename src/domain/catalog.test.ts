import { describe, expect, it } from "vitest";
import { buildCatalogQuery, parseCatalogParams } from "./catalog";

describe("catalog URL state", () => {
  it("parses filters and clamps page size", () => {
    const filters = parseCatalogParams({ q: "Kia K5", country: "kr", yearFrom: "2021", limit: "500", sort: "mileage" });
    expect(filters).toMatchObject({ q: "Kia K5", country: "kr", yearFrom: 2021, limit: 24, sort: "mileage" });
  });

  it("keeps untrusted text in SQL parameters", () => {
    const query = buildCatalogQuery(parseCatalogParams({ q: "%' OR 1=1 --", make: "Kia" }));
    expect(query.text).not.toContain("OR 1=1");
    expect(query.values).toContain("%' OR 1=1 --");
  });
});
