import { describe, expect, it } from "vitest";
import { formatVehicleSpec, parseCostBreakdown, readCostBreakdown, readInsuranceHistory, readInsuranceSummary } from "./car-details";

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

describe("readInsuranceSummary", () => {
  it("returns only the case count and payout in rubles", () => {
    expect(readInsuranceSummary({ insuranceOwn: "1 / 1 227 805 ₩ (77 781 ₽)" })).toBe("1 / 77 781 ₽");
    expect(readInsuranceSummary({ accident: "Страховая история ДТП: 4 / 412 270 ₽" })).toBe("4 / 412 270 ₽");
  });

  it("reports zero claims and hides incomplete or unavailable data", () => {
    expect(readInsuranceSummary({ accident: "Без зарегистрированных ДТП" })).toBe("0 / 0 ₽");
    expect(readInsuranceSummary({ accidentCount: 2 })).toBeNull();
    expect(readInsuranceSummary({})).toBeNull();
  });
});

describe("formatVehicleSpec", () => {
  it("expands technical abbreviations for customers", () => {
    expect(formatVehicleSpec("transmission", "AT")).toBe("Автоматическая (AT)");
    expect(formatVehicleSpec("drive", "2WD")).toBe("Монопривод (2WD)");
    expect(formatVehicleSpec("body", "SUV")).toBe("Кроссовер / внедорожник (SUV)");
  });
});
