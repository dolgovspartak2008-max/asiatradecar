import { describe, expect, it } from "vitest";
import { normalizeFeedCar } from "./sync";

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
});
