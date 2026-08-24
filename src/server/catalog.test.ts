import { afterEach, describe, expect, it, vi } from "vitest";
import { parseCatalogParams } from "../domain/catalog";
import { applyCommission, getCarBySlug, getCatalog, getLatestCars, type Car } from "./catalog";

describe("live Trust Encar catalog", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("loads all public offers when the local database is not configured", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const html = `<script>var TE_CATALOG = {"ajaxUrl":"https://trust-encar.ru/wp-admin/admin-ajax.php","nonce":"public-nonce"};</script>
      <script>window.TE_CATALOG_SSR = {"total":159958,"facets":{"facets":{"marks":[{"value":"19","name":"Kia","count":12000}]}}};</script>
      <article class="auto-item" data-href="https://trust-encar.ru/auto/42569219/">
        <div class="auto-item-img"><img src="https://trust-encar.ru/images/carpicture06/pic4256/42569219_001.jpg" /></div>
        <img class="te-car-title__logo" alt="Kia" /><span class="te-car-title__text">Kia Sportage</span>
        <p class="auto-item-subtitle">Sportage — Signature</p><div class="catalog-item-options">
          <p class="price">Дата регистрации в Корее: 07.2023</p><p class="price price-engv">1598 см³ / Бензин / 2WD</p>
          <p class="price">44 563 км</p><p class="price auto-price">4 217 024 ₽ (30 300 000 ₩)</p><p class="price">Лот: 42569219</p>
        </div><div class="catalog-item-total">Стоимость до Владивостока: ~ 4 217 024 ₽</div>
      </article>`;
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(html, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCatalog(parseCatalogParams({ country: "kr" }));

    expect(result.total).toBe(159958);
    expect(result.makes).toEqual(["Kia"]);
    expect(result.cars[0]).toMatchObject({ id: "42569219", make: "Kia", model: "Sportage", priceRub: 4267024 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://trust-encar.ru/catalog/?page=1", expect.any(Object));
  });

  it("keeps the static home page buildable when the live source is unavailable", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));

    await expect(getLatestCars(4)).resolves.toEqual([]);
  });

  it("returns no car instead of failing when every source is unavailable", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));

    await expect(getCarBySlug("kia-sportage-42569219")).resolves.toBeNull();
  });

  it("loads the selected make models before requesting filtered cars", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const html = `<script>var TE_CATALOG = {"ajaxUrl":"https://trust-encar.ru/wp-admin/admin-ajax.php","nonce":"public-nonce"};</script>
      <script>window.TE_CATALOG_SSR = {"total":159958,"facets":{"facets":{"marks":[{"value":"12","name":"BMW","count":14000}]}}};</script>`;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(html, { status: 200 }))
      .mockResolvedValueOnce(Response.json({ status: "success", facets: { models: [{ value: "18619", name: "3-Series" }] } }))
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json({ status: "success", total: 0 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCatalog(parseCatalogParams({ country: "kr", make: "BMW" }));

    expect(result.models).toEqual(["3-Series"]);
  });

  it("does not silently drop an unresolved model filter", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const html = `<script>var TE_CATALOG = {"ajaxUrl":"https://trust-encar.ru/wp-admin/admin-ajax.php","nonce":"public-nonce"};</script>
      <script>window.TE_CATALOG_SSR = {"total":159958,"facets":{"facets":{"marks":[{"value":"12","name":"BMW","count":14000}]}}};</script>`;
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(html, { status: 200 }))
      .mockResolvedValueOnce(Response.json({ status: "success" })));

    await expect(getCatalog(parseCatalogParams({ country: "kr", make: "BMW", model: "3-Series" }))).rejects.toThrow("идентификатор");
  });

  it("adjusts the live Korea price filter to the displayed fees", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const html = `<script>var TE_CATALOG = {"ajaxUrl":"https://trust-encar.ru/wp-admin/admin-ajax.php","nonce":"public-nonce"};</script>
      <script>window.TE_CATALOG_SSR = {"total":159958,"facets":{"facets":{"marks":[]}}};</script>`;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(html, { status: 200 }))
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json({ status: "success", total: 0 }));
    vi.stubGlobal("fetch", fetchMock);

    await getCatalog(parseCatalogParams({ country: "kr", priceTo: "1000000" }));

    expect((fetchMock.mock.calls[1][1]?.body as URLSearchParams).get("priceRubTo")).toBe("950000");
  });

  it("filters China by make and exposes that make models without a database", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: { series_count: 4687, series: [
      { concern_id: 535, outter_name: "小米SU7", dealer_min_price: 21.59, cover_url: "https://example.test/su7.webp" },
      { concern_id: 536, outter_name: "小米YU7", dealer_min_price: 25.35, cover_url: "https://example.test/yu7.webp" },
      { concern_id: 5, outter_name: "凯美瑞", dealer_min_price: 17.18, cover_url: "https://example.test/camry.webp" }
    ] } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCatalog(parseCatalogParams({ country: "cn", make: "Xiaomi", model: "SU7" }));
    expect(result.total).toBe(1);
    expect(result.models).toEqual(["SU7", "YU7"]);
    expect(fetchMock.mock.calls[0][1]?.body?.toString()).toContain("limit=5000");
    expect(result.cars[0]).toMatchObject({ country: "cn", make: "Xiaomi", model: "SU7", sourceUrl: "https://www.dongchedi.com/auto/series/535" });

    const nextResult = await getCatalog(parseCatalogParams({ country: "cn", make: "Xiaomi", model: "YU7" }));
    expect(nextResult.cars[0]).toMatchObject({ make: "Xiaomi", model: "YU7" });
    expect(fetchMock.mock.calls.filter(([url]) => !url.includes("/motor/pc/sh/sh_sku_list"))).toHaveLength(1);
  });

  it("filters used China listings when the make also exists in the new-model feed", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const usedItem = (city: string) => ({
      sku_id: 88, brand_id: 535, brand_name: "小米汽车", series_name: "小米SU7", car_name: "小米SU7 Max",
      car_year: 2024, sh_price: "21.5万", sub_title: "2024年 | 2万公里", image: "https://example.test/used-su7.webp", car_source_city_name: city
    });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (!url.includes("/motor/pc/sh/sh_sku_list")) return Promise.resolve(Response.json({ data: { series_count: 4_687, series: [
        { concern_id: 535, outter_name: "小米SU7", dealer_min_price: 21.59, cover_url: "https://example.test/new-su7.webp" }
      ] } }));
      const body = init?.body as URLSearchParams;
      const city = body.get("sh_city_name") || "全国";
      return Promise.resolve(Response.json({ data: {
        total: body.get("brand") === "535" ? 321 : 6_000,
        has_more: true,
        search_sh_sku_info_list: [usedItem(city)]
      } }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCatalog(parseCatalogParams({ country: "cn", make: "Xiaomi", yearFrom: "2023", mileageTo: "30000" }));

    expect(result.total).toBe(1);
    expect(result.models).toContain("SU7");
    expect(result.cars[0]).toMatchObject({ id: "dongchedi-used-88", make: "Xiaomi", model: "SU7", year: 2024, mileageKm: 20_000 });
    expect(fetchMock.mock.calls.some(([url, init]) => url.includes("/motor/pc/sh/sh_sku_list") && (init?.body as URLSearchParams).get("brand") === "535")).toBe(true);

    const makeOnly = await getCatalog(parseCatalogParams({ country: "cn", make: "Xiaomi" }));
    expect(new Set(makeOnly.cars.map((car) => car.details.listingType))).toEqual(new Set(["new", "used"]));
  });

  it("keeps an expanded China make selectable when it is absent from the new-model feed", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const usedItem = (city: string) => ({
      sku_id: 77, brand_id: 177, brand_name: "阿维塔", series_name: "阿维塔12", car_name: "阿维塔12 Max",
      car_year: 2024, sh_price: "25.8万", sub_title: "2024年 | 1万公里", image: "https://example.test/avatr.webp", car_source_city_name: city
    });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (!url.includes("/motor/pc/sh/sh_sku_list")) return Promise.resolve(Response.json({ data: { series_count: 4_687, series: [] } }));
      const body = init?.body as URLSearchParams;
      const city = body.get("sh_city_name") || "全国";
      return Promise.resolve(Response.json({ data: {
        total: body.get("brand") === "177" ? 321 : 6_000,
        has_more: true,
        search_sh_sku_info_list: [usedItem(city)]
      } }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCatalog(parseCatalogParams({ country: "cn", make: "阿维塔" }));

    expect(result.total).toBe(321);
    expect(result.makes).toContain("阿维塔");
    expect(result.cars[0]).toMatchObject({ id: "dongchedi-used-77", make: "阿维塔", model: "12" });
    expect(fetchMock.mock.calls.some(([url, init]) => url.includes("/motor/pc/sh/sh_sku_list") && (init?.body as URLSearchParams).get("brand") === "177")).toBe(true);

    await expect(getCarBySlug(result.cars[0].slug)).resolves.toMatchObject({ id: "dongchedi-used-77" });
    expect((fetchMock.mock.calls.at(-1)?.[1]?.body as URLSearchParams).get("brand")).toBe("177");

    const narrowed = await getCatalog(parseCatalogParams({ country: "cn", make: "阿维塔", yearFrom: "2025" }));
    expect(narrowed).toMatchObject({ total: 0, cars: [] });
  });

  it("shows genuine China listings immediately without waiting for a catalog reset", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const cities = ["北京", "上海", "广州", "深圳", "成都", "重庆", "杭州", "武汉", "南京", "天津"];
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      const city = (init?.body as URLSearchParams).get("sh_city_name") || "";
      const cityIndex = cities.indexOf(city);
      const listings = Array.from({ length: 80 }, (_, index) => ({
        sku_id: 100_000 + cityIndex * 1_000 + index,
        brand_id: cityIndex * 2 + index % 2 + 1,
        brand_name: `Brand ${cityIndex}${index % 2 ? "B" : "A"}`,
        series_name: `Model ${cityIndex}${index % 2 ? "B" : "A"}`,
        car_name: `Trim ${index + 1}`,
        car_year: 2021 + index % 3, sh_price: `${18 + index / 10}万`, sub_title: `2022年 | ${2 + index / 10}万公里`,
        image: `https://example.test/car-${cityIndex}-${index}.webp`, car_source_city_name: city
      }));
      return Promise.resolve(Response.json({ data: { total: 6_000, has_more: true, search_sh_sku_info_list: listings } }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCatalog(parseCatalogParams({ country: "cn" }));

    expect(result.total).toBe(60_000);
    expect(result.cars).toHaveLength(24);
    expect(result.makes).toHaveLength(20);
    expect(result.cars[0]).toMatchObject({ id: "dongchedi-used-100000", make: "Brand 0A", model: "Model 0A", trim: "Trim 1", year: 2021, mileageKm: 20_000 });
    expect(result.cars[0].slug).toContain("-pool-beijing-");
    expect(result.cars.every((car) => !car.trim?.startsWith("Комплектация "))).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(10);
    expect(fetchMock.mock.calls[0][0]).toContain("/motor/pc/sh/sh_sku_list");

    await expect(getCarBySlug(result.cars[0].slug)).resolves.toMatchObject({ id: "dongchedi-used-100000" });
    expect((fetchMock.mock.calls.at(-1)?.[1]?.body as URLSearchParams).get("sh_city_name")).toBe("北京");
  });

  it("falls back to unique new China models when used listings are temporarily unavailable", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubGlobal("fetch", vi.fn()
      .mockRejectedValueOnce(new Error("used source unavailable"))
      .mockResolvedValue(Response.json({ data: { series_count: 4687, series: [
        { concern_id: 535, outter_name: "小米SU7", dealer_min_price: 21.59, cover_url: "https://example.test/su7.webp" }
      ] } })));

    const result = await getCatalog(parseCatalogParams({ country: "cn" }));

    expect(result.total).toBe(4_687);
    expect(result.cars.length).toBeGreaterThan(0);
    expect(result.cars.every((car) => car.trim === null)).toBe(true);
  });

  it("filters Japan by selected make and model without a database", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const payload = { items: [{ id: "4e75d2d8-0865-4c72-9bcc-5ddc11bca111", car: { mark: "BMW", model: "3 SERIES" }, characteristics: { year: "2022", engineCapacity: "1.8", engine: "1.8 л / Бензин / 156 л.с." }, onePrice: 1_250_000 }], pagination: { total: 283, totalPages: 3 } };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("ok", { status: 200, headers: { "set-cookie": "session=jp; Path=/" } }))
      .mockResolvedValueOnce(Response.json({ data: [{ id: 2, name: "BMW", hasLots: true }, { id: 5, name: "TOYOTA", hasLots: true }] }))
      .mockResolvedValueOnce(Response.json({ data: [{ id: 11519, name: "3 SERIES", hasLots: true }, { id: 11591, name: "2 SERIES", hasLots: true }] }))
      .mockResolvedValueOnce(Response.json(payload))
      .mockResolvedValueOnce(Response.json(payload))
      .mockResolvedValueOnce(Response.json({ result: { details: {
        CUSTOMS_DUTY: { major: { value: 436_000, currency: "RUB" } },
        CUSTOMS_FEE: { major: { value: 4_924, currency: "RUB" } },
        RECYCLING_FEE: { major: { value: 5_200, currency: "RUB" } },
        EXCISE_TAX: { major: { value: 0, currency: "RUB" } },
        VAT: { major: { value: 0, currency: "RUB" } }
      } } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCatalog(parseCatalogParams({ country: "jp", make: "BMW", model: "3 SERIES" }));
    expect(result.total).toBe(283);
    expect(result.makes).toEqual(["BMW", "TOYOTA"]);
    expect(result.models).toEqual(["2 SERIES", "3 SERIES"]);
    expect(result.cars[0]).toMatchObject({ country: "jp", make: "BMW", model: "3 SERIES", priceRub: 1_542_324, sourceUrl: expect.stringContaining("banzai24.com/car/JP/") });
    expect(result.cars[0].details.costBreakdown).toEqual(expect.arrayContaining([
      { label: "Таможенная пошлина", value: "436 000 ₽" },
      { label: "Таможенный сбор", value: "4 924 ₽" },
      { label: "Утилизационный сбор", value: "5 200 ₽" }
    ]));
  });
});

describe("Korea commission", () => {
  const car = {
    id: "db-1", slug: "db-1", sourceUrl: null, country: "kr", currencyCode: "KRW", make: "Kia", model: "K5", trim: null,
    year: 2022, mileageKm: 20_000, engineCc: null, powerHp: null, fuel: null, transmission: null, drive: null,
    bodyType: null, exteriorColor: null, interiorColor: null, vin: null, priceKrw: 10_000_000, priceRub: 590_000, photos: [], details: {}
  } satisfies Car;

  it("adds current fees to a raw database price", () => {
    expect(applyCommission(car, 150_000, false).priceRub).toBe(850_000);
  });
});
