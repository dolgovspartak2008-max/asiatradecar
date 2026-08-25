import { beforeEach, describe, expect, it, vi } from "vitest";
import { hasDatabase, query } from "./db";
import { getPricingSettings, setCatalogRate } from "./pricing";

vi.mock("./db", () => ({ hasDatabase: vi.fn(), query: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hasDatabase).mockReturnValue(true);
});

describe("Telegram pricing settings", () => {
  it("reads current country commissions and catalog rates from the database", async () => {
    vi.mocked(query).mockImplementation(async (sql) => String(sql).includes("site_settings")
      ? { rows: [
          { key: "commission_kr_rub", value: "125000" },
          { key: "commission_jp_rub", value: "150000" },
          { key: "commission_cn_rub", value: "175000" }
        ] } as never
      : { rows: [
          { code: "KRW", rub_per_unit: "0.061" },
          { code: "JPY", rub_per_unit: "0.64" },
          { code: "CNY", rub_per_unit: "12.1" }
        ] } as never);

    await expect(getPricingSettings()).resolves.toEqual({
      commissions: { kr: 125_000, jp: 150_000, cn: 175_000 },
      rates: { KRW: 0.061, JPY: 0.64, CNY: 12.1 }
    });
  });

  it("stores a Telegram rate in per-unit form used by the catalog", async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);

    await setCatalogRate("JPY", 62);

    expect(vi.mocked(query).mock.calls[0][1]).toEqual(["JPY", 0.62]);
  });

  it("does not let the legacy shared commission override the Japan default", async () => {
    vi.mocked(query).mockImplementation(async (sql) => String(sql).includes("site_settings")
      ? { rows: [{ key: "commission_rub", value: "100000" }] } as never
      : { rows: [] } as never);

    await expect(getPricingSettings()).resolves.toMatchObject({
      commissions: { kr: 100_000, jp: 50_000, cn: 100_000 }
    });
  });
});
