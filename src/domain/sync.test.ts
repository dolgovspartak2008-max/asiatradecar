import { describe, expect, it } from "vitest";
import { buildFeedPageUrl, normalizeFeedCar, normalizeTrustEncarRecord } from "./sync";

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
});
