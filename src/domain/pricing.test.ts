import { describe, expect, it } from "vitest";
import { buildExternalPricing, normalizeCostBreakdown } from "./pricing";

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

  it("calculates Japan with local expenses, customs, commission and broker", () => {
    expect(buildExternalPricing("jp", 1_250_000, 0.62, 436_000)).toEqual({
      priceRub: 1_476_000,
      costBreakdown: [
        { label: "Стоимость автомобиля в Японии", value: "1 250 000 ¥ (775 000 ₽)" },
        { label: "Расходы по Японии", value: "250 000 ¥ (155 000 ₽)" },
        { label: "Таможенная пошлина (предварительно)", value: "436 000 ₽" },
        { label: "Комиссия компании", value: "50 000 ₽" },
        { label: "Таможенный брокер", value: "60 000 ₽" }
      ]
    });
  });

  it("calculates China with a 100000 commission and an 80000 broker", () => {
    expect(buildExternalPricing("cn", 100_000, 11.5)).toMatchObject({
      priceRub: 1_330_000,
      costBreakdown: expect.arrayContaining([
        { label: "Комиссия компании", value: "100 000 ₽" },
        { label: "Таможенный брокер", value: "80 000 ₽" }
      ])
    });
  });

  it("removes won amounts when a Korean source also provides rubles", () => {
    expect(normalizeCostBreakdown([
      { label: "Стоимость автомобиля в Корее", value: "30 300 000 ₩ (1 965 864 ₽)" }
    ])).toContainEqual({ label: "Стоимость автомобиля в Корее", value: "1 965 864 ₽" });
  });

  it("replaces the Korean broker with 110000 rubles", () => {
    expect(normalizeCostBreakdown([
      { label: "Услуги таможенного брокера", value: "60 000 ₽" }
    ], 100_000, 110_000)).toEqual([
      { label: "Комиссия компании", value: "100 000 ₽" },
      { label: "Таможенный брокер", value: "110 000 ₽" }
    ]);
  });
});
