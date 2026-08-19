import { describe, expect, it } from "vitest";
import { parseCatalogParams } from "./catalog";
import * as sync from "./sync";

const { buildFeedPageUrl, normalizeFeedCar, normalizeTrustEncarRecord } = sync;

describe("authorized catalog feed", () => {
  it("normalizes a real provider record without inventing absent fields", () => {
    const car = normalizeFeedCar({
      id: "42569219",
      make: "Kia",
      model: "Sportage",
      year: 2023,
      mileageKm: 44563,
      priceKrw: 30300000,
      photos: ["https://cdn.example.test/42569219/1.webp"]
    });
    expect(car.slug).toBe("kia-sportage-42569219");
    expect(car.vin).toBeNull();
    expect(car.status).toBe("active");
  });

  it("requests larger feed pages while preserving provider parameters", () => {
    expect(buildFeedPageUrl("https://trust-encar.ru/feed?country=kr", "next-2", 1_000).toString())
      .toBe("https://trust-encar.ru/feed?country=kr&limit=1000&cursor=next-2");
  });

  it("maps Trust Encar catalog records into the Korean feed schema", () => {
    const car = normalizeTrustEncarRecord({
      ID: "42569219",
      MARKA_NAME: "Kia",
      MODEL_NAME: "Sportage",
      GRADE: "Gasoline 1.6 Turbo 2WD Signature",
      YEAR: "2023",
      MILEAGE: "44563",
      ENG_V: "1598",
      POWER_TEXT: "180 л.с.",
      TIME: "G",
      PRIV: "2WD",
      KUZOV: "SUV",
      COLOR: "White",
      SEAT_COLOR: "Black series",
      VEHICLENO: "230오5656",
      FINISH: "30300000",
      IMAGES: "[\"https://ci.encar.com/carpicture06/pic4256/42569219_001.jpg\"]"
    });

    expect(car).toMatchObject({
      id: "42569219",
      make: "Kia",
      model: "Sportage",
      year: 2023,
      mileageKm: 44563,
      engineCc: 1598,
      powerHp: 180,
      fuel: "Бензин",
      drive: "2WD",
      priceKrw: 30300000
    });
    expect(car.photos).toHaveLength(1);
    expect(car.photos[0]).toBe("https://trust-encar.ru/images/carpicture06/pic4256/42569219_001.jpg");
  });

  it("extracts the public live-catalog bootstrap from the catalog page", () => {
    const parseBootstrap = Reflect.get(sync, "parseTrustEncarBootstrap");
    expect(parseBootstrap).toBeTypeOf("function");
    if (typeof parseBootstrap !== "function") return;

    const html = `<script>var TE_CATALOG = {"ajaxUrl":"https://trust-encar.ru/wp-admin/admin-ajax.php","nonce":"public-nonce"};</script>
      <script>window.TE_CATALOG_SSR = {"total":159958,"facets":{"facets":{"marks":[{"value":"19","name":"Kia","count":12000}]}}};</script>`;

    expect(parseBootstrap(html)).toEqual({
      ajaxUrl: "https://trust-encar.ru/wp-admin/admin-ajax.php",
      nonce: "public-nonce",
      total: 159958,
      makes: [{ id: "19", name: "Kia" }]
    });
  });

  it("maps local filters to the Trust Encar search API", () => {
    const buildBody = Reflect.get(sync, "buildTrustEncarSearchBody");
    expect(buildBody).toBeTypeOf("function");
    if (typeof buildBody !== "function") return;

    const body = buildBody(
      "search_db",
      parseCatalogParams({ make: "Kia", yearFrom: "2021", priceTo: "3500000", page: "3", sort: "price-asc" }),
      { nonce: "public-nonce", makes: [{ id: "19", name: "Kia" }] }
    );

    expect(body.toString()).toContain("action=search_db");
    expect(body.toString()).toContain("nonce=public-nonce");
    expect(body.toString()).toContain("page=2");
    expect(body.toString()).toContain("marka_id=19");
    expect(body.toString()).toContain("year_from=2021");
    expect(body.toString()).toContain("priceRubTo=3500000");
    expect(body.toString()).toContain("field_sort=FINISH_RUB");
    expect(body.toString()).toContain("order_by=ASC");
  });
});
