import { describe, expect, it } from "vitest";
import { formatCnyPriceRange, getBanzaiCursorWindow, parseBanzaiApiPage, parseBanzaiCatalog, parseBanzaiVehiclePage, parseDongchediCatalog, parseDongchediSeriesPage, parseDongchediUsedPage, translateChineseCarName, translateChineseTrim } from "./external-catalog";

describe("external catalog parsers", () => {
  it("parses full Japanese API records with source details and photos", () => {
    const result = parseBanzaiApiPage({
      items: [{
        id: "01a00b58-3300-7525-9f55-6cd378bc3239",
        car: { mark: "TOYOTA", model: "COROLLA", year: "2020.03" },
        characteristics: { mileage: 34000, modification: "HYBRID S 4WD", transmission: "Автомат", drivetrain: "Полный", color: "SILVER", fuelType: "Гибрид", engineCapacity: "1.8", engine: "1.8 л / Гибрид / 98 л.с.", bodyNumber: "ZWE214W-60***99" },
        registrationYear: 2020,
        startPrice: "80000",
        endPrice: "1298000",
        images: ["https://banzai24.com/api/image-service/one"],
        lot: { auction: { name: "TAA Yokohama" }, number: "63-1035-12003", tradeDate: "2026-08-22", tradeTime: "10:00" },
        grade: "3",
        status: { name: "Продан" },
        tags: [{ title: "Проверено JapanStat" }]
      }],
      pagination: { currentPage: 1, totalPages: 849, perPage: 100, total: 84824 }
    });
    expect(result.total).toBe(84824);
    expect(result.totalPages).toBe(849);
    expect(result.cars[0]).toMatchObject({
      country: "jp", currencyCode: "JPY", make: "TOYOTA", model: "COROLLA", year: 2020,
      mileageKm: 34000, engineCc: 1800, powerHp: 98, drive: "Полный", sourcePrice: 1298000,
      sourceUrl: "https://banzai24.com/car/JP/01a00b58-3300-7525-9f55-6cd378bc3239"
    });
    expect(result.cars[0].photos).toHaveLength(1);
    expect(result.cars[0].details).toMatchObject({ auction: "TAA Yokohama", status: "Продан", grade: "3" });
    expect(result.cars[0].status).toBe("inactive");
  });

  it("covers every Japanese API page exactly once across a 24-run cycle", () => {
    const ranges: ReturnType<typeof getBanzaiCursorWindow>[] = [];
    let nextPage = 1;
    do { const range = getBanzaiCursorWindow(849, nextPage); ranges.push(range); nextPage = range.nextPage; } while (nextPage !== 1);
    const pages = ranges.flatMap(({ start, end }) => Array.from({ length: end - start + 1 }, (_, index) => start + index));
    expect(ranges).toHaveLength(24);
    expect(pages).toEqual(Array.from({ length: 849 }, (_, index) => index + 1));
  });

  it("resumes a delayed Japanese cycle from its persistent cursor", () => {
    expect(getBanzaiCursorWindow(849, 72)).toEqual({ start: 72, end: 107, nextPage: 108, completed: false });
    expect(getBanzaiCursorWindow(849, 820)).toEqual({ start: 820, end: 849, nextPage: 1, completed: true });
    expect(getBanzaiCursorWindow(700, 800)).toMatchObject({ start: 1, completed: false });
  });
  it("translates Chinese brands and models into readable English names", () => {
    expect(translateChineseCarName("红旗", "红旗HS5")).toEqual({ make: "Hongqi", model: "HS5" });
    expect(translateChineseCarName("丰田", "凯美瑞")).toEqual({ make: "Toyota", model: "Camry" });
    expect(translateChineseCarName("比亚迪", "海豹06DM")).toEqual({ make: "BYD", model: "Seal 06 DM" });
    expect(translateChineseCarName("蔚来", "蔚来EC6")).toEqual({ make: "NIO", model: "EC6" });
    expect(translateChineseCarName("捷豹", "捷豹XEL")).toEqual({ make: "Jaguar", model: "XEL" });
    expect(translateChineseCarName("宝马", "宝马2系(进口)", "101")).toEqual({ make: "BMW", model: "2 Series (Import)" });
    expect(translateChineseCarName("未知品牌", "未知车型", "99")).toEqual({ make: "China Auto", model: "Model 99" });
    expect(translateChineseTrim("15T 双离合互联精英型 国VI", ["双离合", "互联"])).toBe("15T Dual-Clutch Connected Elite China VI");
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
      cover_url: "http://p3-dcd.byteimg.com/camry.png", car_ids: [250143, 250144, 250145]
    }] } });

    expect(parsed.total).toBe(4687);
    expect(parsed.cars).toHaveLength(1);
    expect(parsed.cars[0]).toMatchObject({ id: "dongchedi-535", make: "Toyota", model: "Camry", trim: null, sourcePrice: 129_800 });
    expect(parsed.cars[0].details).toMatchObject({
      listingType: "new",
      carIds: ["250143", "250144", "250145"],
      optionGroups: [{ title: "Данные модели", items: ["Доступно комплектаций: 3", "Диапазон цен: 171 800 ¥"] }]
    });
  });

  it("reads genuine used Dongchedi listings with their own price, year and mileage", () => {
    const parsed = parseDongchediUsedPage({ data: { total: 10_000, has_more: true, search_sh_sku_info_list: [{
      sku_id: 356463767, brand_name: "别克", series_name: "英朗", car_name: "15T 双离合互联精英型 国VI",
      car_year: 2019, sh_price: "\ue463.\ue411\ue4e3\ue40a", sub_title: "\ue463\ue439\ue525 | \ue411.\ue411\ue439\ue40a\ue492\ue4a8",
      image: "https://example.test/buick.webp", car_source_city_name: "成都", transfer_cnt: 1, series_id: 344, car_id: 43015
    }] } }, 1, 24);

    expect(parsed.total).toBe(10_000);
    expect(parsed.hasMore).toBe(true);
    expect(parsed.cars[0]).toMatchObject({
      id: "dongchedi-used-356463767", source: "dongchedi-used", make: "Buick", model: "Excelle GT",
      trim: "15T Dual-Clutch Connected Elite China VI", year: 2019, mileageKm: 55_000, sourcePrice: 25_800,
      sourceUrl: "https://www.dongchedi.com/usedcar/356463767"
    });
    expect(parsed.cars[0].slug).toMatch(/-1-24-356463767$/);
    expect(parsed.cars[0].details).toMatchObject({ listingType: "used", city: "Chengdu", sourcePage: 1, sourceLimit: 24 });
    expect(JSON.stringify(parsed.cars[0])).not.toMatch(/[\u3400-\u9fff]/);
  });

  it("keeps a real Chinese brand instead of collapsing it into China Auto", () => {
    const parsed = parseDongchediUsedPage({ data: { total: 1, has_more: false, search_sh_sku_info_list: [{
      sku_id: 9, brand_id: 177, brand_name: "阿维塔", series_name: "阿维塔12", car_name: "阿维塔12 Max",
      car_year: 2024, sh_price: "25.8万", sub_title: "2024年 | 1万公里", image: "https://example.test/avatr.webp", car_source_city_name: "成都"
    }] } });

    expect(parsed.cars[0]).toMatchObject({ make: "阿维塔", model: "12", details: { brandId: "177" } });
  });

  it("formats Chinese ten-thousand-yuan ranges without hieroglyphs", () => {
    expect(formatCnyPriceRange("12.98-21.98")).toBe("129 800–219 800 ¥");
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

  it("reads a Banzai24 vehicle page for an internal detail route", () => {
    const html = `<h1>TOYOTA PRIUS, Z 4WD</h1><main>
      <div>Year : 2023.05</div><div>Mileage : 40 000 km</div><div>Gearbox : Automatic</div>
      <div>Color : Black</div><div>Engine : 2.0 l / Petrol / 243 hp</div><div>Drive : Front</div>
      <div>Body number/VIN: MXWH65-40***32</div><div>Final price: 2 535 000 ¥</div>
      <img src="https://banzai24.com/api/image-service/prius" /></main>`;
    expect(parseBanzaiVehiclePage(html, "019eb9bd-bd29-7c5d-9df8-6c57d81d9c88")).toMatchObject({
      make: "TOYOTA", model: "PRIUS", trim: "Z 4WD", year: 2023, mileageKm: 40_000,
      engineCc: 2_000, powerHp: 243, sourcePrice: 2_535_000,
      sourceUrl: "https://banzai24.com/car/JP/019eb9bd-bd29-7c5d-9df8-6c57d81d9c88"
    });
  });

  it("uses the Japanese starting bid before an auction has a final price", () => {
    const html = `<h1>TOYOTA PIXIS SPACE, CUSTOM RS</h1><main>
      <div>Год : 2014.06</div><div>Пробег : 125 000 км</div><div>Двигатель : 0.7 л</div>
      <div>Старт от: 17 000 ¥</div><div>Конечная цена: 0 ¥</div></main>`;

    expect(parseBanzaiVehiclePage(html, "01a02386-f5d6-714c-8615-d221652bb6d1")).toMatchObject({
      make: "TOYOTA", model: "PIXIS SPACE", trim: "CUSTOM RS", year: 2014,
      mileageKm: 125_000, engineCc: 700, sourcePrice: 17_000
    });
  });
});
