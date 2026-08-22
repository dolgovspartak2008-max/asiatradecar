import { describe, expect, it } from "vitest";
import { formatVehicleSpec, readCostBreakdown, readInsuranceHistory } from "./car-details";

describe("readCostBreakdown", () => {
  it("keeps only complete source expense rows", () => {
    expect(readCostBreakdown({ costBreakdown: [
      { label: "Комиссия агента", value: "93 000 ₽" },
      { label: "", value: "100 ₽" },
      null
    ] })).toEqual([{ label: "Комиссия компании", value: "100 000 ₽" }]);
  });
});

describe("readInsuranceHistory", () => {
  it("prefers the detailed own-damage history from the vehicle page", () => {
    expect(readInsuranceHistory({ insuranceOwn: "1 / 1 227 805 ₩ (77 781 ₽)", accident: "ДТП: 1" }))
      .toBe("1 страховой случай · сумма 1 227 805 ₩ (77 781 ₽)");
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
