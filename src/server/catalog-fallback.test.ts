import { afterEach, expect, it, vi } from "vitest";
import { query } from "./db";
import { getCarBySlug, getSitemapCars } from "./catalog";

vi.mock("./db", () => ({ hasDatabase: () => true, query: vi.fn(), getPool: () => ({ query: vi.fn().mockResolvedValue({}) }) }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(query).mockReset();
});

it("returns no car when both the live source and configured database are unavailable", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));
  vi.mocked(query).mockRejectedValue(new Error("database unavailable"));

  await expect(getCarBySlug("kia-sportage-42569219")).resolves.toBeNull();
});

it("adds the current commission and broker fee to a raw Korea database price", async () => {
  vi.mocked(query).mockImplementation(async (sql) => {
    const text = String(sql);
    if (text.startsWith("SELECT * FROM cars")) return { rows: [{
      id: "db-1", slug: "db-car", source_url: null, country: "kr", make: "Kia", model: "K5", trim: null, year: 2022,
      mileage_km: 20_000, engine_cc: null, power_hp: null, fuel: null, transmission: null, drive: null, body_type: null,
      exterior_color: null, interior_color: null, vin: null, price_krw: 10_000_000, price_rub: 590_000, photos: [], details: {}
    }] } as never;
    if (text.includes("site_settings")) return { rows: [{ key: "commission_kr_rub", value: "150000" }] } as never;
    if (text.includes("exchange_rates")) return { rows: [] } as never;
    return { rows: [] } as never;
  });

  await expect(getCarBySlug("db-car")).resolves.toMatchObject({ priceRub: 850_000 });
});

it("returns active sitemap cars with real update dates and first images", async () => {
  vi.mocked(query).mockResolvedValue({ rows: [{ slug: "kia-k5-1", updated_at: new Date("2026-08-20"), photos: ["https://example.test/k5.webp"] }] } as never);

  await expect(getSitemapCars()).resolves.toEqual([{ slug: "kia-k5-1", updatedAt: new Date("2026-08-20"), image: "https://example.test/k5.webp" }]);
  expect(vi.mocked(query).mock.calls[0][0]).toContain("status = 'active'");
});
