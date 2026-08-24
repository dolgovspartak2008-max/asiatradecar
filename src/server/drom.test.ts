import { afterEach, describe, expect, it, vi } from "vitest";
import { getDromCustomsCostsRub, vehicleAgeGroup } from "./drom";

describe("Drom customs calculator", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("maps the vehicle year to Drom age groups", () => {
    expect(vehicleAgeGroup(2025, 2026)).toBe("UNDER_3");
    expect(vehicleAgeGroup(2022, 2026)).toBe("FROM_3_TO_5");
    expect(vehicleAgeGroup(2019, 2026)).toBe("OVER_5");
  });

  it("reads every mandatory customs charge from the Drom result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ result: { details: {
      PRICE: { major: { value: 677000, currency: "RUB" } },
      CUSTOMS_DUTY: { major: { value: 436000, currency: "RUB" } },
      CUSTOMS_FEE: { major: { value: 4924, currency: "RUB" } },
      RECYCLING_FEE: { major: { value: 5200, currency: "RUB" } },
      EXCISE_TAX: { major: { value: 0, currency: "RUB" } },
      VAT: { major: { value: 0, currency: "RUB" } }
    } } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getDromCustomsCostsRub({ sourcePrice: 1_298_000, currency: "YEN", year: 2022, engineCc: 1_800, powerHp: 98 }, 2026)).resolves.toEqual({
      dutyRub: 436_000, customsFeeRub: 4_924, recyclingFeeRub: 5_200, exciseRub: 0, vatRub: 0
    });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe("https://www.drom.ru/api/world/calculate/");
    expect(url.searchParams.get("vehicleAge")).toBe("FROM_3_TO_5");
    expect(url.searchParams.get("currency")).toBe("YEN");
  });

  it("still calculates engine-based charges when the source omits horsepower", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ result: { details: {
      CUSTOMS_DUTY: { major: { value: 930_000, currency: "RUB" } },
      CUSTOMS_FEE: { major: { value: 4_924, currency: "RUB" } },
      RECYCLING_FEE: { major: { value: 5_200, currency: "RUB" } }
    } } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getDromCustomsCostsRub({ sourcePrice: 916_000, currency: "YEN", year: 2017, engineCc: 2_000, powerHp: null }, 2026))
      .resolves.toMatchObject({ dutyRub: 930_000, customsFeeRub: 4_924, recyclingFeeRub: 5_200 });
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("engineHorsePower")).toBe("1");
  });
});
