import { afterEach, describe, expect, it, vi } from "vitest";
import { getDromCustomsDutyRub, vehicleAgeGroup } from "./drom";

describe("Drom customs calculator", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("maps the vehicle year to Drom age groups", () => {
    expect(vehicleAgeGroup(2025, 2026)).toBe("UNDER_3");
    expect(vehicleAgeGroup(2022, 2026)).toBe("FROM_3_TO_5");
    expect(vehicleAgeGroup(2019, 2026)).toBe("OVER_5");
  });

  it("reads the customs duty from the official Drom result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ result: { details: {
      PRICE: { major: { value: 677000, currency: "RUB" } },
      CUSTOMS_DUTY: { major: { value: 436000, currency: "RUB" } }
    } } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getDromCustomsDutyRub({ priceJpy: 1_298_000, year: 2022, engineCc: 1_800, powerHp: 98 }, 2026)).resolves.toBe(436_000);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe("https://www.drom.ru/api/world/calculate/");
    expect(url.searchParams.get("vehicleAge")).toBe("FROM_3_TO_5");
    expect(url.searchParams.get("currency")).toBe("YEN");
  });
});
