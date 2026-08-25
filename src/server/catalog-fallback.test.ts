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
  expect(catalogCall?.[1]).toEqual(["jp", 900_000, 24, 0]);
});

it("uses the complete China used-car archive even when the new-model feed is below its old threshold", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(query).mockImplementation(async (sql) => {
    const text = String(sql);
    if (text.includes("count(*) FILTER")) return { rows: [{ ready: true }] } as never;
    if (text.includes("site_settings") || text.includes("exchange_rates")) return { rows: [] } as never;
    if (text.startsWith("SELECT * FROM cars")) return { rows: [{
      id: "cn-1", slug: "cn-car-1", source_url: null, country: "cn", currency_code: "CNY", make: "Toyota", model: "Camry", trim: null, year: 2023,
      mileage_km: 20_000, engine_cc: null, power_hp: null, fuel: null, transmission: null, drive: null, body_type: null,
      exterior_color: null, interior_color: null, vin: null, price_krw: 100_000, price_rub: 1_443_000, photos: [], details: {}
    }] } as never;
    if (text.startsWith("SELECT count(*)")) return { rows: [{ count: "321" }] } as never;
    if (text.startsWith("SELECT DISTINCT make")) return { rows: [{ make: "Toyota" }] } as never;
    if (text.startsWith("SELECT DISTINCT model")) return { rows: [{ model: "Camry" }] } as never;
    return { rows: [] } as never;
  });

  const result = await getCatalog(parseCatalogParams({ country: "cn", make: "Toyota" }));

  const readinessSql = String(vi.mocked(query).mock.calls.find(([sql]) => String(sql).includes("count(*) FILTER"))?.[0]);
  expect(readinessSql).not.toContain("source = 'dongchedi'");
  expect(result).toMatchObject({ total: 321, cars: [expect.objectContaining({ make: "Toyota", model: "Camry" })] });
  expect(fetchMock).not.toHaveBeenCalled();
});

it("relabels legacy China model identifiers without waiting for a resync", async () => {
  vi.stubGlobal("fetch", vi.fn());
  vi.mocked(query).mockImplementation(async (sql) => {
    const text = String(sql);
    if (text.includes("count(*) FILTER")) return { rows: [{ ready: true }] } as never;
    if (text.includes("site_settings") || text.includes("exchange_rates")) return { rows: [] } as never;
    if (text.startsWith("SELECT * FROM cars")) return { rows: [{
      id: "cn-legacy", slug: "cn-legacy", source_url: null, country: "cn", currency_code: "CNY", make: "Buick", model: "Model 345", trim: null, year: 2023,
      mileage_km: 20_000, engine_cc: null, power_hp: null, fuel: null, transmission: null, drive: null, body_type: null,
      exterior_color: null, interior_color: null, vin: null, price_krw: 100_000, price_rub: 1_443_000, photos: [], details: {}
    }] } as never;
    if (text.startsWith("SELECT count(*)")) return { rows: [{ count: "321" }] } as never;
    if (text.startsWith("SELECT DISTINCT make")) return { rows: [{ make: "Buick" }] } as never;
    if (text.startsWith("SELECT DISTINCT model")) return { rows: [{ model: "Envision" }, { model: "Model 345" }] } as never;
    return { rows: [] } as never;
  });

  const result = await getCatalog(parseCatalogParams({ country: "cn", make: "Buick" }));
  expect(result.models).toEqual(["Buick", "Envision"]);
  expect(result.cars[0]).toMatchObject({ make: "Buick", model: "Buick" });

  await getCatalog(parseCatalogParams({ country: "cn", make: "Buick", model: "Buick" }));
  const catalogCalls = vi.mocked(query).mock.calls.filter(([sql]) => String(sql).startsWith("SELECT * FROM cars"));
  expect(catalogCalls.at(-1)?.[1]?.filter((value) => value === "Buick")).toHaveLength(1);
});

it("keeps an empty filtered result from a complete external archive", async () => {
  const fetchMock = vi.fn().mockRejectedValue(new Error("live fallback must not run"));
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(query).mockImplementation(async (sql) => {
    const text = String(sql);
    if (text.includes("count(*) FILTER")) return { rows: [{ ready: true }] } as never;
    if (text.includes("site_settings") || text.includes("exchange_rates") || text.startsWith("SELECT DISTINCT")) return { rows: [] } as never;
    if (text.startsWith("SELECT count(*)")) return { rows: [{ count: "0" }] } as never;
    if (text.startsWith("SELECT * FROM cars")) return { rows: [] } as never;
    return { rows: [] } as never;
  });

  await expect(getCatalog(parseCatalogParams({ country: "cn", make: "Toyota", model: "missing" })))
    .resolves.toMatchObject({ total: 0, cars: [] });
  expect(fetchMock).not.toHaveBeenCalled();
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
  vi.stubGlobal("fetch", vi.fn().mockImplementation((input: string | URL) => {
    const url = String(input);
    if (url === "https://banzai24.com/") return Promise.resolve(new Response("ok", { status: 200, headers: { "set-cookie": "session=jp; Path=/" } }));
    if (url.includes("/companies")) return Promise.resolve(Response.json({ data: [{ id: 2, name: "BMW", hasLots: true }] }));
    if (url.includes("/lots")) return Promise.resolve(Response.json(payload));
    return Promise.resolve(Response.json({ result: { details: {} } }));
  }));

  const result = await getCatalog(parseCatalogParams({ country: "jp" }));

  expect(result.total).toBe(2_733_154);
  expect(vi.mocked(query).mock.calls.some(([sql]) => String(sql).includes("catalog_banzai_archive_last_completed_epoch"))).toBe(true);
  expect(vi.mocked(query).mock.calls.some(([sql]) => String(sql).startsWith("SELECT * FROM cars"))).toBe(false);
});
