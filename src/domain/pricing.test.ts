import { describe, expect, it } from "vitest";
import { buildExternalPricing, CHINA_EXPENSES_RUB, normalizeCostBreakdown } from "./pricing";

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
    expect(buildExternalPricing("jp", 1_250_000, 0.62, { dutyRub: 436_000, customsFeeRub: 4_924, recyclingFeeRub: 5_200 })).toEqual({
      priceRub: 1_542_324,
      costBreakdown: [
        { label: "Комиссия компании", value: "100 000 ₽" },
        { label: "Стоимость автомобиля в Японии", value: "1 250 000 ¥ (775 000 ₽)" },
        { label: "Расходы по Японии и фрахт во Владивосток", value: "260 000 ¥ (161 200 ₽)" },
        { label: "Таможенная пошлина", value: "436 000 ₽" },
        { label: "Таможенный сбор", value: "4 924 ₽" },
        { label: "Утилизационный сбор", value: "5 200 ₽" },
        { label: "Акциз", value: "0 ₽" },
        { label: "НДС", value: "0 ₽" },
        { label: "Таможенный брокер", value: "60 000 ₽" },
        { label: "Логистика (автовоз)", value: "Рассчитывается отдельно в зависимости от города доставки" }
      ]
    });
  });

  it("calculates China with a 100000 commission and an 80000 broker", () => {
    expect(CHINA_EXPENSES_RUB).toBe(113_000);
    expect(buildExternalPricing("cn", 100_000, 11.5, { dutyRub: 523_000, customsFeeRub: 13_541, recyclingFeeRub: 1_838_400 })).toEqual({
      priceRub: 3_817_941,
      costBreakdown: [
        { label: "Комиссия компании", value: "100 000 ₽" },
        { label: "Стоимость автомобиля в Китае", value: "100 000 ¥ (1 150 000 ₽)" },
        { label: "Расходы по Китаю и фрахт во Владивосток", value: "113 000 ₽" },
        { label: "Таможенная пошлина", value: "523 000 ₽" },
        { label: "Таможенный сбор", value: "13 541 ₽" },
        { label: "Утилизационный сбор", value: "1 838 400 ₽" },
        { label: "Акциз", value: "0 ₽" },
        { label: "НДС", value: "0 ₽" },
        { label: "Таможенный брокер", value: "80 000 ₽" },
        { label: "Логистика (автовоз)", value: "Рассчитывается отдельно в зависимости от города доставки" }
      ]
    });
  });

  it("uses the fixed 100000 ruble company commission for every country", () => {
    expect(buildExternalPricing("jp", 1_000_000, 0.62)).toMatchObject({
      priceRub: 941_200,
      costBreakdown: expect.arrayContaining([{ label: "Комиссия компании", value: "100 000 ₽" }])
    });
  });

  it("uses the current country commission from Telegram settings", () => {
    expect(buildExternalPricing("jp", 1_000_000, 0.62, {}, 175_000)).toMatchObject({
      priceRub: 1_016_200,
      costBreakdown: expect.arrayContaining([{ label: "Комиссия компании", value: "175 000 ₽" }])
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
