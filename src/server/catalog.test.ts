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
      <script>window.TE_CATALOG_SSR = {"total":159958,"facets":{"facets":{"marks":[{"value":"19","name":"Kia","count":12000}]}}};</script>`;
    const upstreamCar = {
      ID: "42569219", MARKA_NAME: "Kia", MODEL_NAME: "Sportage", GRADE: "Signature", YEAR: "2023",
      MILEAGE: "44563", ENG_V: "1598", POWER_TEXT: "180 л.с.", TIME: "G", PRIV: "2WD",
      FINISH: "30300000", FINISH_RUB: "4217024",
      IMAGES: "[\"https://ci.encar.com/carpicture06/pic4256/42569219_001.jpg\"]"
    };
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(html, { status: 200 }))
      .mockResolvedValueOnce(Response.json([upstreamCar]))
      .mockResolvedValueOnce(Response.json({ status: "success", total: 159958 })));

    const result = await getCatalog(parseCatalogParams({ country: "kr" }));

    expect(result.total).toBe(159958);
    expect(result.makes).toEqual(["Kia"]);
    expect(result.cars[0]).toMatchObject({ id: "42569219", make: "Kia", model: "Sportage", priceRub: 4217024 });
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
});
