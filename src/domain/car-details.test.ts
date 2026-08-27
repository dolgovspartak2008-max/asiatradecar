import { describe, expect, it } from "vitest";
import { formatVehicleSpec, parseCostBreakdown, readCostBreakdown, readInsuranceHistory, reconcileCostBreakdown } from "./car-details";

describe("readCostBreakdown", () => {
  it("keeps only complete source expense rows", () => {
    expect(readCostBreakdown({ costBreakdown: [
      { label: "Комиссия агента", value: "93 000 ₽" },
      { label: "", value: "100 ₽" },
      null
    ] })).toEqual([{ label: "Комиссия компании", value: "100 000 ₽" }]);
  });

  it("can preserve a server-calculated breakdown without replacing its commission", () => {
    expect(parseCostBreakdown({ costBreakdown: [
      { label: "Комиссия компании", value: "125 000 ₽" },
      { label: "Брокер", value: "60 000 ₽" }
    ] })).toEqual([
      { label: "Комиссия компании", value: "125 000 ₽" },
      { label: "Брокер", value: "60 000 ₽" }
    ]);
  });

  it("adds the source adjustment needed for the rows to equal the displayed total", () => {
    expect(reconcileCostBreakdown([
      { label: "Комиссия компании", value: "100 000 ₽" },
      { label: "Стоимость автомобиля", value: "1 000 000 ₽" },
      { label: "Логистика", value: "Рассчитывается отдельно" }
    ], 1_125_000)).toEqual([
      { label: "Комиссия компании", value: "100 000 ₽" },
      { label: "Стоимость автомобиля", value: "1 000 000 ₽" },
      { label: "Логистика", value: "Рассчитывается отдельно" },
      { label: "Корректировка расчёта источника", value: "25 000 ₽" }
    ]);
  });
});

describe("readInsuranceHistory", () => {
  it("prefers the detailed own-damage history from the vehicle page", () => {
    expect(readInsuranceHistory({ insuranceOwn: "1 / 1 227 805 ₩ (77 781 ₽)", accident: "ДТП: 1" }))
      .toBe("1 страховой случай\nсумма 77 781 ₽");
  });

  it("falls back to the catalog accident summary", () => {
    expect(readInsuranceHistory({ accident: "Без зарегистрированных ДТП" })).toBe("Без зарегистрированных ДТП");
    expect(readInsuranceHistory({})).toBe("Нет данных в источнике");
  });
});

describe("formatVehicleSpec", () => {
  it("expands technical abbreviations for customers", () => {
    expect(formatVehicleSpec("transmission", "AT")).toBe("Автоматическая (AT)");
    expect(formatVehicleSpec("drive", "2WD")).toBe("Монопривод (2WD)");
    expect(formatVehicleSpec("body", "SUV")).toBe("Кроссовер / внедорожник (SUV)");
  });
});
