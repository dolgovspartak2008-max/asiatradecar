import { describe, expect, it } from "vitest";
import { catalogPriceFor, rememberCatalogPrices } from "./catalog-price-cache";

describe("catalog price cache", () => {
  it("keeps the catalog price for the matching detail page", () => {
    rememberCatalogPrices([{ slug: "kia-k5-1", priceRub: 2_345_678 }], 1_000);
    expect(catalogPriceFor("kia-k5-1", 2_300_000, 1_001)).toBe(2_345_678);
  });

  it("falls back when the remembered price expired", () => {
    rememberCatalogPrices([{ slug: "kia-k5-expired", priceRub: 2_345_678 }], 1_000);
    expect(catalogPriceFor("kia-k5-expired", 2_300_000, 601_001)).toBe(2_300_000);
  });
});
