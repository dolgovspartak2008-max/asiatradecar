import { describe, expect, it } from "vitest";
import { normalizeCatalogRate, parseCbrCurrencyRate, parseCbrKrwRate } from "./currency";

describe("parseCbrKrwRate", () => {
  it("normalizes the CBR nominal to one Korean won", () => {
    const xml = `<Valute><CharCode>KRW</CharCode><Nominal>1000</Nominal><Value>58,1200</Value></Valute>`;
    expect(parseCbrKrwRate(xml)).toBeCloseTo(0.05812, 6);
  });

  it("rejects a response without KRW", () => {
    expect(() => parseCbrKrwRate("<ValCurs />")).toThrow("KRW rate not found");
  });
});

describe("parseCbrCurrencyRate", () => {
  it("parses the document date and nominal", () => {
    const xml = `<ValCurs Date="19.08.2026"><Valute><CharCode>EUR</CharCode><Nominal>1</Nominal><Value>92,4500</Value></Valute></ValCurs>`;
    expect(parseCbrCurrencyRate(xml, "EUR")).toEqual({ code: "EUR", rubPerUnit: 92.45, date: "2026-08-19" });
  });
});

describe("normalizeCatalogRate", () => {
  it("accepts both per-unit and common nominal inputs", () => {
    expect(normalizeCatalogRate("JPY", 62)).toBeCloseTo(0.62, 6);
    expect(normalizeCatalogRate("JPY", 0.62)).toBeCloseTo(0.62, 6);
    expect(normalizeCatalogRate("KRW", 59)).toBeCloseTo(0.059, 6);
    expect(normalizeCatalogRate("CNY", 11.5)).toBeCloseTo(11.5, 6);
  });
});
