import { describe, expect, it } from "vitest";
import { calculateImportCost, customsDutyRub, IMPORT_COST_DEFAULTS } from "./calculator";

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
      fuel: "petrol"
    });

    expect(result.carPriceRub).toBe(1_160_000);
    expect(result.agentFeeRub).toBe(90_000);
    expect(result.koreaLogisticsRub).toBe(110_200);
    expect(result.customsClearanceRub).toBe(80_000);
    expect(result.customsDutyRub).toBe(539_460);
    expect(result.recyclingFeeRub).toBe(5_200);
    expect(result.vatRub).toBe(0);
    expect(result.exciseRub).toBe(0);
    expect(result.totalRub).toBe(Object.values(result.lines).reduce((sum, value) => sum + value, 0));
    expect(result.isApproximate).toBe(true);
  });

  it("uses the fixed service terms requested for preliminary quotes", () => {
    expect(IMPORT_COST_DEFAULTS).toEqual({
      agentFeeRub: 90_000,
      koreaLogisticsKrw: 1_900_000,
      customsClearanceRub: 80_000
    });
  });
});
