import { describe, expect, it } from "vitest";
import { applyCatalogPricing, normalizeCostBreakdown } from "./pricing";

describe("catalog pricing", () => {
  const raw = [
    { label: "Комиссия агента по договору", value: "93 000 ₽" },
    { label: "Фиксированный сбор корейской площадки Encar", value: "28 239 ₽" },
    { label: "Доставка авто на стоянку логистической компании", value: "7 000 ₽" },
    { label: "Таможенная пошлина", value: "2 095 000 ₽" }
  ];

  it("uses a 100000 ruble commission and removes absent charges", () => {
    expect(normalizeCostBreakdown(raw, 100_000)).toEqual([
      { label: "Комиссия компании", value: "100 000 ₽" },
      { label: "Таможенная пошлина", value: "2 095 000 ₽" }
    ]);
  });

  it("applies country rate and commission to external source prices", () => {
    expect(applyCatalogPricing(1_250_000, 0.62, 100_000)).toBe(875_000);
  });
});
