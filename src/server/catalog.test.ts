import { afterEach, describe, expect, it, vi } from "vitest";
import { parseCatalogParams } from "../domain/catalog";
import { getCarBySlug, getCatalog, getLatestCars } from "./catalog";

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

  it("loads China directly when the database is unavailable", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: { series_count: 1, series: [{ concern_id: 535, outter_name: "小米SU7", dealer_min_price: 21.59, cover_url: "https://example.test/su7.webp" }] } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCatalog(parseCatalogParams({ country: "cn" }));
    expect(result.total).toBe(1);
    expect(result.cars[0]).toMatchObject({ country: "cn", make: "Xiaomi", model: "SU7", sourceUrl: "https://www.dongchedi.com/auto/series/535" });
  });

  it("loads Japan directly when the database is unavailable", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const payload = { items: [{ id: "4e75d2d8-0865-4c72-9bcc-5ddc11bca111", car: { mark: "Toyota", model: "Prius" }, characteristics: { year: "2022" }, onePrice: 1_250_000 }], pagination: { total: 86_781, totalPages: 868 } };
    const fetchMock = vi.fn().mockImplementation((input: string | URL) => String(input) === "https://banzai24.com/"
      ? Promise.resolve(new Response("ok", { status: 200, headers: { "set-cookie": "session=jp; Path=/" } }))
      : Promise.resolve(Response.json(payload)));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCatalog(parseCatalogParams({ country: "jp" }));
    expect(result.total).toBe(86_781);
    expect(result.cars[0]).toMatchObject({ country: "jp", make: "Toyota", model: "Prius", sourceUrl: expect.stringContaining("banzai24.com/car/JP/") });
  });
});
