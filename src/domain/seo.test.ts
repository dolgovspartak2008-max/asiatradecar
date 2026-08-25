import { describe, expect, it } from "vitest";
import type { Car } from "@/server/catalog";
import {
  buildCatalogHref,
  buildOrganizationSchema,
  buildSitemapEntries,
  buildVehicleSchema,
  getCatalogMarket,
  isFilteredCatalog
} from "./seo";

const car: Car = {
  id: "42", slug: "hyundai-tucson-42", sourceUrl: "https://example.com/42", country: "kr", currencyCode: "KRW",
  make: "Hyundai", model: "Tucson", trim: "Premium", year: 2023, mileageKm: 31_000, engineCc: 1998,
  powerHp: 186, fuel: "Бензин", transmission: "Автомат", drive: "Полный", bodyType: "SUV", exteriorColor: "Белый",
  interiorColor: null, vin: null, priceKrw: 32_000_000, priceRub: 3_250_000,
  photos: ["https://images.example.com/tucson.webp"], details: {}
};

describe("catalog SEO", () => {
  it("maps stable country slugs to catalog sources", () => {
    expect(getCatalogMarket("korea")?.country).toBe("kr");
    expect(getCatalogMarket("japan")?.country).toBe("jp");
    expect(getCatalogMarket("china")?.country).toBe("cn");
    expect(getCatalogMarket("unknown")).toBeUndefined();
  });

  it("builds crawlable page URLs while preserving filters", () => {
    expect(buildCatalogHref("korea", "make=Hyundai&page=2", 3)).toBe("/catalog/korea?make=Hyundai&page=3");
    expect(buildCatalogHref("korea", "page=2", 1)).toBe("/catalog/korea");
  });

  it("noindexes filter and sort combinations but not plain pagination", () => {
    expect(isFilteredCatalog({ page: "2" })).toBe(false);
    expect(isFilteredCatalog({ make: "Hyundai", page: "2" })).toBe(true);
    expect(isFilteredCatalog({ sort: "price-asc" })).toBe(true);
  });
});

describe("structured data", () => {
  it("emits Product and Car with visible facts and a priced offer", () => {
    const schema = buildVehicleSchema(car, "https://asia-trade-car.ru");
    expect(schema["@type"]).toEqual(["Product", "Car"]);
    expect(schema.brand).toEqual({ "@type": "Brand", name: "Hyundai" });
    expect(schema.sku).toBe("42");
    expect(schema.offers).toMatchObject({ price: 3250000, priceCurrency: "RUB" });
    expect(schema.offers).not.toHaveProperty("availability");
  });

  it("omits empty images, zero prices and unsupported availability claims", () => {
    const schema = buildVehicleSchema({ ...car, photos: [], priceRub: null }, "https://asia-trade-car.ru");
    expect(schema).not.toHaveProperty("image");
    expect(schema).not.toHaveProperty("offers");
  });

  it("connects legal organization data through a stable id", () => {
    const schema = buildOrganizationSchema({
      name: "ASIA TRADE CAR", owner: "ИП Охтий Олеся Сергеевна", inn: "220419337642", ogrn: "326220200067030",
      address: "Бийск", url: "https://asia-trade-car.ru", logo: "/media/asia-trade-car-logo-transparent.webp",
      phone: "", email: "", sameAs: ["https://t.me/AsiaTradeCar"]
    });
    expect(schema["@id"]).toBe("https://asia-trade-car.ru/#organization");
    expect(schema.identifier).toHaveLength(2);
    expect(schema.sameAs).toEqual(["https://t.me/AsiaTradeCar"]);
  });
});

describe("sitemap", () => {
  it("contains canonical public pages and active vehicle URLs only", () => {
    const entries = buildSitemapEntries("https://asia-trade-car.ru", [{ slug: car.slug, updatedAt: new Date("2026-08-20"), image: car.photos[0] }]);
    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain("https://asia-trade-car.ru/catalog/korea");
    expect(urls).toContain("https://asia-trade-car.ru/catalog/japan");
    expect(urls).toContain("https://asia-trade-car.ru/catalog/china");
    expect(urls).toContain("https://asia-trade-car.ru/auto/hyundai-tucson-42");
    expect(urls.some((url) => url.includes("/legal/"))).toBe(false);
    expect(entries.find((entry) => entry.url.endsWith(car.slug))?.lastModified).toEqual(new Date("2026-08-20"));
  });

  it("does not exceed the 50000 URL sitemap limit", () => {
    const cars = Array.from({ length: 50_000 }, (_, index) => ({
      slug: `car-${index}`,
      updatedAt: new Date("2026-08-20")
    }));

    expect(buildSitemapEntries("https://asia-trade-car.ru", cars)).toHaveLength(50_000);
  });
});
