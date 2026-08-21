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
      { nonce: "public-nonce", makes: [{ id: "19", name: "Kia" }] },
      "103"
    );

    expect(body.toString()).toContain("action=search_db");
    expect(body.toString()).toContain("nonce=public-nonce");
    expect(body.toString()).toContain("page=2");
    expect(body.toString()).toContain("marka_id=19");
    expect(body.toString()).toContain("model_id=103");
    expect(body.toString()).toContain("year_from=2021");
    expect(body.toString()).toContain("priceRubTo=3500000");
    expect(body.toString()).toContain("field_sort=FINISH_RUB");
    expect(body.toString()).toContain("order_by=ASC");
  });

  it("extracts model ids and names from the live facets response", () => {
    const parseModels = Reflect.get(sync, "parseTrustEncarModelsFacet");
    expect(parseModels).toBeTypeOf("function");
    if (typeof parseModels !== "function") return;

    expect(parseModels({ status: "success", facets: { models: [
      { value: "103", name: "Sportage", count: 1200 },
      { value: "104", label: "Sorento", count: 900 }
    ] } })).toEqual([
      { id: "103", name: "Sportage" },
      { id: "104", name: "Sorento" }
    ]);
  });

  it("parses the server-rendered catalog page used for progressive loading", () => {
    const parsePage = Reflect.get(sync, "parseTrustEncarCatalogPage");
    expect(parsePage).toBeTypeOf("function");
    if (typeof parsePage !== "function") return;

    const html = `<script>var TE_CATALOG = {"ajaxUrl":"https://trust-encar.ru/wp-admin/admin-ajax.php","nonce":"public-nonce"};</script>
      <script>window.TE_CATALOG_SSR = {"total":159958,"facets":{"facets":{"marks":[{"value":"19","name":"Kia","count":12000}]}}};</script>
      <div class="auto-list"><article class="auto-item" data-href="https://trust-encar.ru/auto/42569219/">
        <div class="auto-item-img"><img src="https://trust-encar.ru/images/carpicture06/pic4256/42569219_001.jpg" /></div>
        <img class="te-car-title__logo" alt="Kia" />
        <span class="te-car-title__text">Kia Sportage</span>
        <p class="auto-item-subtitle">Sportage 5th generation — Gasoline 1.6 Turbo 2WD Signature</p>
        <div class="catalog-item-options">
          <p class="price">Дата регистрации в Корее: 07.2023</p>
          <p class="price price-engv">1598 см³ / Бензин / 2WD</p>
          <p class="price price-engv">180 л.с.</p>
          <p class="price">Кроссовер / 5 местный</p>
          <p class="price">Кузов: Белый / Салон: Чёрный</p>
          <p class="price">44 563 км</p>
          <p class="price auto-price">Стоимость авто в Корее: 1 965 864 ₽ (30 300 000 ₩)</p>
          <p class="price">Лот: 42569219</p>
        </div>
        <p class="auto-item-acc">Страховая история ДТП: 1 / 77 781 ₽</p>
        <p class="auto-item-total">Стоимость до Владивостока: ~ 4 217 024 ₽</p>
      </article></div>`;

    const result = parsePage(html);
    expect(result.total).toBe(159958);
    expect(result.makes).toEqual(["Kia"]);
    expect(result.cars[0]).toMatchObject({
      id: "42569219", make: "Kia", model: "Sportage", year: 2023,
      mileageKm: 44563, engineCc: 1598, powerHp: 180, fuel: "Бензин",
      drive: "2WD", priceKrw: 30300000, priceRub: 4217024
    });
    expect(result.cars[0].details).toMatchObject({ koreaPriceRub: 1965864, accident: "Страховая история ДТП: 1 / 77 781 ₽" });
    expect(result.cars[0].photos).toEqual(["https://trust-encar.ru/images/carpicture06/pic4256/42569219_001.jpg"]);
  });

  it("parses a direct vehicle page without the slow search endpoint", () => {
    const parseVehicle = Reflect.get(sync, "parseTrustEncarVehiclePage");
    expect(parseVehicle).toBeTypeOf("function");
    if (typeof parseVehicle !== "function") return;
    const vehicle = {
      "@context": "https://schema.org", "@type": "Vehicle", sku: "42569219",
      name: "Kia Sportage Gasoline 1.6 Turbo 2WD Signature", brand: { name: "Kia" }, model: "Sportage",
      vehicleConfiguration: "Gasoline 1.6 Turbo 2WD Signature", productionDate: "2023",
      mileageFromOdometer: { value: 44563 }, vehicleEngine: { engineDisplacement: { value: 1598 } },
      fuelType: "Бензин", color: "White", vehicleTransmission: "AT",
      image: ["https://trust-encar.ru/images/carpicture06/pic4256/42569219_001.jpg?size=large"],
      offers: { priceCurrency: "RUB", price: "4217024" }
    };
    const html = `<script type="application/ld+json">${JSON.stringify(vehicle)}</script><ul class="product-options">
      <li class="product-option"><div class="product-option-label">Привод</div>2WD</li>
      <li class="product-option"><div class="product-option-label">Мощность</div>180 л.с.</li>
      <li class="product-option"><div class="product-option-label">Стоимость авто в Корее</div>30 300 000 ₩ (1 965 864 ₽)</li>
      <li class="product-option"><div class="product-option-label">Цвет салона</div>Чёрный</li>
    </ul><div>Страховая история: повреждения этого автомобиля <strong>1 / 1 227 805 ₩ (77 781 ₽)</strong> Страховая история: повреждения другого автомобиля</div>
      <div class="calc-detail__line"><span class="calc-detail__subtitle">Комиссия агента по договору:</span><b class="calc-detail__price">93 000 ₽</b></div>
      <div class="calc-detail__line"><span class="calc-detail__subtitle">Стоимость автомобиля в Корее:</span><b class="calc-detail__price">30 300 000 ₩ (1 965 864 ₽)</b></div>`;
    expect(parseVehicle(html)).toMatchObject({
      id: "42569219", make: "Kia", model: "Sportage", year: 2023, mileageKm: 44563,
      engineCc: 1598, powerHp: 180, fuel: "Бензин", drive: "2WD", priceKrw: 30300000,
      priceRub: 4217024, interiorColor: "Чёрный",
      details: {
        koreaPriceRub: 1965864,
        insuranceOwn: "1 / 1 227 805 ₩ (77 781 ₽)",
        costBreakdown: [
          { label: "Комиссия агента по договору", value: "93 000 ₽" },
          { label: "Стоимость автомобиля в Корее", value: "30 300 000 ₩ (1 965 864 ₽)" }
        ]
      }
    });
  });

  it("does not label the Korea-only price as a turnkey price", () => {
    const parsePage = Reflect.get(sync, "parseTrustEncarCatalogPage");
    const html = `<script>var TE_CATALOG = {"ajaxUrl":"https://trust-encar.ru/wp-admin/admin-ajax.php","nonce":"public-nonce"};</script>
      <script>window.TE_CATALOG_SSR = {"total":1,"facets":{"facets":{"marks":[{"value":"2","name":"Kia"}]}}};</script>
      <article class="auto-item" data-href="https://trust-encar.ru/auto/42569219/"><img class="te-car-title__logo" alt="Kia"/><span class="te-car-title__text">Kia Sportage</span><div class="catalog-item-options"><p class="price">Дата регистрации в Корее: 07.2023</p><p class="price auto-price">Стоимость авто в Корее: 1 965 864 ₽ (30 300 000 ₩)</p></div></article>`;

    expect(parsePage(html).cars[0].priceRub).toBeNull();
  });
});
