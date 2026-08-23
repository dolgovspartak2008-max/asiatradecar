import { afterEach, describe, expect, it, vi } from "vitest";
import * as dongchedi from "./dongchedi";

const { fetchDongchediUsedPage } = dongchedi;

describe("Dongchedi used catalog client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("requests a real page of used listings from the official endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: {
      total: 10_000,
      has_more: true,
      search_sh_sku_info_list: [{
        sku_id: 123,
        brand_id: 4,
        brand_name: "宝马",
        series_name: "宝马3系",
        car_name: "325Li M运动套装",
        car_year: 2022,
        sh_price: "\ue463\ue439.\ue411\ue40a",
        sub_title: "\ue463\ue439\ue463\ue463\ue525 | \ue463.\ue411\ue40a\ue40a\ue492\ue4a8",
        image: "https://example.test/bmw.webp"
      }]
    } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchDongchediUsedPage(3, 60, "成都", "4");

    expect(result.cars[0]).toMatchObject({ id: "dongchedi-used-123", make: "BMW", model: "3 Series", sourcePrice: 205_000, mileageKm: 25_000, details: { brandId: "4" } });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/motor/pc/sh/sh_sku_list"), expect.objectContaining({
      method: "POST",
      body: expect.any(URLSearchParams)
    }));
    expect(fetchMock.mock.calls[0][1].body.toString()).toContain("page=3");
    expect(fetchMock.mock.calls[0][1].body.toString()).toContain("limit=60");
    expect(fetchMock.mock.calls[0][1].body.toString()).toContain("sh_city_name=%E6%88%90%E9%83%BD");
    expect(fetchMock.mock.calls[0][1].body.toString()).toContain("brand=4");
  });

  it("browses more than 50,000 unique listings across city pools", async () => {
    const browse = Reflect.get(dongchedi, "fetchDongchediUsedBrowsePage");
    expect(browse).toBeTypeOf("function");
    if (typeof browse !== "function") return;
    const item = (id: number, city: string, brandId: number, brandName: string) => ({
      sku_id: id, brand_id: brandId, brand_name: brandName, series_name: `${brandName}${id}`, car_name: `${brandName} ${id}`,
      car_year: 2022, sh_price: "20.5万", sub_title: "2022年 | 2.5万公里", image: `https://example.test/${id}.webp`, car_source_city_name: city
    });
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = init.body as URLSearchParams;
      const city = body.get("sh_city_name") || "";
      const base = city === "成都" ? 1_000 : 2_000;
      const brandId = city === "成都" ? 177 : 535;
      const brandName = city === "成都" ? "阿维塔" : "小米汽车";
      return Response.json({ data: { total: 30_000, has_more: true, search_sh_sku_info_list: Array.from({ length: 80 }, (_, index) => item(base + index, city, brandId, brandName)) } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = await browse(0, 24, ["成都", "北京"]);
    const secondCity = await browse(30_000, 24, ["成都", "北京"]);

    expect(first.total).toBe(60_000);
    expect(first.cars).toHaveLength(24);
    expect(new Set(first.cars.map((car: { id: string }) => car.id)).size).toBe(24);
    expect(first.facets.map((car: { make: string }) => car.make)).toEqual(expect.arrayContaining(["阿维塔", "Xiaomi"]));
    expect(secondCity.cars[0].id).toBe("dongchedi-used-2000");
  });

  it("keeps more than 50,000 listings available when one city is temporarily unavailable", async () => {
    const browse = Reflect.get(dongchedi, "fetchDongchediUsedBrowsePage");
    const cities = Reflect.get(dongchedi, "DONGCHEDI_USED_CITIES") as readonly string[];
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const city = (init.body as URLSearchParams).get("sh_city_name") || "";
      if (city === cities[0]) throw new Error("city unavailable");
      const cityIndex = cities.indexOf(city);
      const items = Array.from({ length: 80 }, (_, index) => ({
        sku_id: cityIndex * 1_000 + index, brand_id: cityIndex + 1, brand_name: `Brand ${cityIndex}`, series_name: `Model ${index}`,
        car_name: `Trim ${index}`, car_year: 2022, sh_price: "20.5万", sub_title: "2022年 | 2.5万公里",
        image: `https://example.test/${cityIndex}-${index}.webp`, car_source_city_name: city
      }));
      return Response.json({ data: { total: 6_000, has_more: true, search_sh_sku_info_list: items } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await browse(0, 24);

    expect(result.total).toBe(54_000);
    expect(result.cars).toHaveLength(24);
  });

  it("merges city pools by real listing id without duplicates", async () => {
    const fetchCatalog = Reflect.get(dongchedi, "fetchDongchediUsedCatalog");
    expect(fetchCatalog).toBeTypeOf("function");
    if (typeof fetchCatalog !== "function") return;
    const item = (id: number) => ({
      sku_id: id, brand_name: "宝马", series_name: "宝马3系", car_name: `BMW ${id}`, car_year: 2022,
      sh_price: "\ue463\ue439.\ue411\ue40a", sub_title: "\ue463\ue439\ue463\ue463\ue525 | \ue463.\ue411\ue40a\ue40a\ue492\ue4a8", image: `https://example.test/${id}.webp`
    });
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = init.body as URLSearchParams;
      const ids = body.get("sh_city_name") === "成都" ? [1, 2] : [2, 3];
      return Response.json({ data: { total: 2, has_more: false, search_sh_sku_info_list: ids.map(item) } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchCatalog(["成都", "北京"], 3, 2);

    expect(result.cars.map((car: { id: string }) => car.id)).toEqual(["dongchedi-used-1", "dongchedi-used-2", "dongchedi-used-3"]);
    expect(result.sourceTotal).toBe(4);
  });
});
