import { describe, expect, it } from "vitest";
import { calculateImportCost, customsDutyRub } from "./calculator";

describe("customsDutyRub", () => {
  it("uses the 3–5 year engine-volume rate for an individual", () => {
    expect(customsDutyRub({ ageYears: 4, customsValueEur: 12_000, engineCc: 1998, eurToRub: 100 })).toBe(539_460);
  });

  it("uses the higher over-five-year rate", () => {
    expect(customsDutyRub({ ageYears: 6, customsValueEur: 12_000, engineCc: 1998, eurToRub: 100 })).toBe(959_040);
  });
});

describe("calculateImportCost", () => {
  it("returns a transparent total and keeps VAT and excise separate", () => {
    const result = calculateImportCost({
      priceKrw: 20_000_000,
      krwToRub: 0.058,
      eurToRub: 100,
      ageYears: 4,
      engineCc: 1998,
      powerHp: 150,
      fuel: "petrol",
      agentFeeRub: 100_000,
      koreaCostsRub: 200_000,
      freightToVladivostokRub: 150_000,
      cityLogisticsRub: 0
    });

    expect(result.carPriceRub).toBe(1_160_000);
    expect(result.customsDutyRub).toBe(539_460);
    expect(result.recyclingFeeRub).toBe(5_200);
    expect(result.vatRub).toBe(0);
    expect(result.exciseRub).toBe(0);
    expect(result.totalRub).toBe(Object.values(result.lines).reduce((sum, value) => sum + value, 0));
    expect(result.isApproximate).toBe(true);
  });
});
