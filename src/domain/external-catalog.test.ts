import { describe, expect, it } from "vitest";
import { parseBanzaiCatalog, parseDongchediCatalog, parseDongchediSeriesPage, translateChineseCarName } from "./external-catalog";

describe("external catalog parsers", () => {
  it("translates Chinese brands and models into readable English names", () => {
    expect(translateChineseCarName("红旗", "红旗HS5")).toEqual({ make: "Hongqi", model: "HS5" });
    expect(translateChineseCarName("丰田", "凯美瑞")).toEqual({ make: "Toyota", model: "Camry" });
    expect(translateChineseCarName("比亚迪", "海豹06DM")).toEqual({ make: "BYD", model: "Seal 06 DM" });
  });

  it("reads China models from Dongchedi Next data", () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { newCarData: [{
      series_id: 26133,
      brand_name: "大众",
      series_name: "ID. ERA 5S",
      cover_url: "http://p9-dcd.byteimg.com/car.png",
      online_date_unix: 1787241600,
      price_info: { price: "11.99-14.99", unit_text: "万" }
    }] } } })}</script>`;

    expect(parseDongchediCatalog(html)).toEqual([expect.objectContaining({
      id: "dongchedi-26133",
      country: "cn",
      currencyCode: "CNY",
      make: "Volkswagen",
      model: "ID. ERA 5S",
      sourcePrice: 119_900,
      sourceUrl: "https://www.dongchedi.com/auto/series/26133"
    })]);
  });

  it("reads a paginated Dongchedi series response and its complete total", () => {
    const parsed = parseDongchediSeriesPage({ status: "success", data: { series_count: 4687, series: [{
      concern_id: 535, outter_name: "凯美瑞", dealer_min_price: "12.98", min_price: 17.18,
      cover_url: "http://p3-dcd.byteimg.com/camry.png"
    }] } });

    expect(parsed.total).toBe(4687);
    expect(parsed.cars).toEqual([expect.objectContaining({
      id: "dongchedi-535", make: "Toyota", model: "Camry", sourcePrice: 129_800
    })]);
  });

  it("reads Japan lots from Banzai24 cards", () => {
    const html = `<div class="card card_shadow">
      <a class="card__info-link" href="/car/JP/lot-1"><p class="text-semibold">TOYOTA COROLLA, HYBRID</p></a>
      <p class="card__lot-info">Лот 101, JU Tokyo</p>
      <span>Год :</span><span>2022</span><span>Пробег :</span><span>31 000 км</span>
      <span>Коробка :</span><span>Автомат</span><span>Двигатель :</span><span>1.8 л / 122 л.с.</span>
      <span>Конечная цена:</span><span>1 250 000 ¥</span>
      <img src="https://banzai24.com/api/image-service/test" />
    </div>`;

    expect(parseBanzaiCatalog(html).cars).toEqual([expect.objectContaining({
      id: "banzai-lot-1",
      country: "jp",
      currencyCode: "JPY",
      make: "TOYOTA",
      model: "COROLLA",
      trim: "HYBRID",
      year: 2022,
      mileageKm: 31_000,
      sourcePrice: 1_250_000
    })]);
  });
});
