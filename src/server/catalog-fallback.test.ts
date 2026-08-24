import { afterEach, expect, it, vi } from "vitest";
import { parseCatalogParams } from "../domain/catalog";
import { query } from "./db";
import { getCarBySlug, getCatalog, getSitemapCars } from "./catalog";

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

it("uses the database page when the live filtered page is incomplete", async () => {
  const row = (index: number) => ({
    id: `db-${index}`, slug: `db-car-${index}`, source_url: null, country: "kr", make: "BMW", model: "M5", trim: null, year: 2022,
    mileage_km: 20_000, engine_cc: null, power_hp: null, fuel: null, transmission: null, drive: null, body_type: null,
    exterior_color: null, interior_color: null, vin: null, price_krw: 10_000_000, price_rub: 590_000, photos: [], details: {}
  });
  vi.mocked(query).mockImplementation(async (sql) => {
    const text = String(sql);
    if (text.startsWith("SELECT * FROM cars")) return { rows: Array.from({ length: 24 }, (_, index) => row(index)) } as never;
    if (text.startsWith("SELECT count(*)")) return { rows: [{ count: "96" }] } as never;
    if (text.startsWith("SELECT DISTINCT make")) return { rows: [{ make: "BMW" }] } as never;
    if (text.includes("site_settings")) return { rows: [] } as never;
    if (text.includes("exchange_rates")) return { rows: [] } as never;
    return { rows: [] } as never;
  });
  const bootstrap = `<script>var TE_CATALOG = {"ajaxUrl":"https://trust-encar.ru/wp-admin/admin-ajax.php","nonce":"public-nonce"};</script>
    <script>window.TE_CATALOG_SSR = {"total":159958,"facets":{"facets":{"marks":[]}}};</script>`;
  const liveCars = [1, 2].map((id) => ({ ID: String(id), LOT: String(id), MARKA_NAME: "BMW", MODEL_NAME: "M5", YEAR: 2022, MILEAGE: 20_000, FINISH: 10_000_000, FINISH_RUB: 900_000, IMAGES: [] }));
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce(new Response(bootstrap, { status: 200 }))
    .mockResolvedValueOnce(Response.json(liveCars))
    .mockResolvedValueOnce(Response.json({ status: "success", total: 96 })));

  const result = await getCatalog(parseCatalogParams({ country: "kr", yearTo: "2024" }));

  expect(result.total).toBe(96);
  expect(result.cars).toHaveLength(24);
  expect(result.cars[0].id).toBe("db-0");
});

it("keeps a partial live page when the database cannot provide a full page", async () => {
  vi.mocked(query).mockImplementation(async (sql) => {
    const text = String(sql);
    if (text.startsWith("SELECT * FROM cars")) return { rows: [] } as never;
    if (text.startsWith("SELECT count(*)")) return { rows: [{ count: "0" }] } as never;
    if (text.includes("site_settings") || text.includes("exchange_rates") || text.startsWith("SELECT DISTINCT")) return { rows: [] } as never;
    return { rows: [] } as never;
  });
  const bootstrap = `<script>var TE_CATALOG = {"ajaxUrl":"https://trust-encar.ru/wp-admin/admin-ajax.php","nonce":"public-nonce"};</script>
    <script>window.TE_CATALOG_SSR = {"total":159958,"facets":{"facets":{"marks":[]}}};</script>`;
  const liveCars = [1, 2].map((id) => ({ ID: String(id), LOT: String(id), MARKA_NAME: "BMW", MODEL_NAME: "M5", YEAR: 2022, MILEAGE: 20_000, FINISH: 10_000_000, FINISH_RUB: 900_000, IMAGES: [] }));
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce(new Response(bootstrap, { status: 200 }))
    .mockResolvedValueOnce(Response.json(liveCars))
    .mockResolvedValueOnce(Response.json({ status: "success", total: 96 })));

  const result = await getCatalog(parseCatalogParams({ country: "kr", yearTo: "2024" }));

  expect(result.total).toBe(96);
  expect(result.cars).toHaveLength(2);
  expect(result.cars[0].id).toBe("1");
});

it("filters Korea database prices by the final price with current fees", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("live unavailable")));
  vi.mocked(query).mockImplementation(async (sql) => {
    const text = String(sql);
    if (text.includes("site_settings")) return { rows: [{ key: "commission_kr_rub", value: "150000" }] } as never;
    if (text.includes("exchange_rates")) return { rows: [] } as never;
    if (text.startsWith("SELECT count(*)")) return { rows: [{ count: "0" }] } as never;
    return { rows: [] } as never;
  });

  await getCatalog(parseCatalogParams({ country: "kr", priceTo: "1000000" }));

  const catalogCall = vi.mocked(query).mock.calls.find(([sql]) => String(sql).startsWith("SELECT * FROM cars"));
  expect(catalogCall?.[1]).toEqual(["kr", 740_000, 24, 0]);
});

it("filters external database prices by the current commission delta", async () => {
  vi.mocked(query).mockImplementation(async (sql) => {
    const text = String(sql);
    if (text.includes("catalog_banzai_archive_last_completed_epoch")) return { rows: [{ ready: true }] } as never;
    if (text.includes("site_settings")) return { rows: [{ key: "commission_jp_rub", value: "150000" }] } as never;
    if (text.includes("exchange_rates")) return { rows: [] } as never;
    if (text.startsWith("SELECT * FROM cars")) return { rows: [{
      id: "jp-1", slug: "jp-car-1", source_url: null, country: "jp", currency_code: "JPY", make: "BMW", model: "M5", trim: null, year: 2022,
      mileage_km: 20_000, engine_cc: null, power_hp: null, fuel: null, transmission: null, drive: null, body_type: null,
      exterior_color: null, interior_color: null, vin: null, price_krw: 0, price_rub: 900_000, photos: [], details: {}
    }] } as never;
    if (text.startsWith("SELECT count(*)")) return { rows: [{ count: "1" }] } as never;
    return { rows: [] } as never;
  });

  await getCatalog(parseCatalogParams({ country: "jp", priceTo: "1000000" }));

  const catalogCall = vi.mocked(query).mock.calls.find(([sql]) => String(sql).startsWith("SELECT * FROM cars"));
  expect(catalogCall?.[1]).toEqual(["jp", 950_000, 24, 0]);
});

it("returns active sitemap cars with real update dates and first images", async () => {
  vi.mocked(query).mockResolvedValue({ rows: [{ slug: "kia-k5-1", updated_at: new Date("2026-08-20"), photos: ["https://example.test/k5.webp"] }] } as never);

  await expect(getSitemapCars()).resolves.toEqual([{ slug: "kia-k5-1", updatedAt: new Date("2026-08-20"), image: "https://example.test/k5.webp" }]);
  expect(vi.mocked(query).mock.calls[0][0]).toContain("status = 'active'");
});

it("keeps Japan on the live archive until the first archive sync cycle is complete", async () => {
  vi.mocked(query).mockResolvedValue({ rows: [{ ready: false }] } as never);
  const payload = {
    items: [{ id: "4e75d2d8-0865-4c72-9bcc-5ddc11bca111", car: { mark: "BMW", model: "3 SERIES" }, characteristics: { year: "2022", engineCapacity: "1.8" }, onePrice: 1_250_000 }],
    pagination: { total: 2_733_154, totalPages: 1 }
  };
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce(new Response("ok", { status: 200, headers: { "set-cookie": "session=jp; Path=/" } }))
    .mockResolvedValueOnce(Response.json({ data: [{ id: 2, name: "BMW", hasLots: true }] }))
    .mockResolvedValueOnce(Response.json(payload))
    .mockResolvedValueOnce(Response.json({ result: { details: {} } })));

  const result = await getCatalog(parseCatalogParams({ country: "jp" }));

  expect(result.total).toBe(2_733_154);
  expect(vi.mocked(query).mock.calls.some(([sql]) => String(sql).includes("catalog_banzai_archive_last_completed_epoch"))).toBe(true);
  expect(vi.mocked(query).mock.calls.some(([sql]) => String(sql).startsWith("SELECT * FROM cars"))).toBe(false);
});
