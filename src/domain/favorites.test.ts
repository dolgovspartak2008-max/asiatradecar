import { describe, expect, it } from "vitest";
import { isFavorite, parseFavoriteEntries, resolveFavoriteCars, toggleFavorite } from "./favorites";

const japan = {
  id: "banzai-1", slug: "jp-toyota-corolla-1", country: "jp", make: "TOYOTA", model: "COROLLA", trim: "HYBRID",
  year: 2022, mileageKm: 30_000, engineCc: 1800, powerHp: 122, drive: "4WD", priceRub: 1_500_000, photos: ["https://example.test/car.jpg"]
} as const;

describe("catalog favorites", () => {
  it("keeps full cars from every country in one store", () => {
    const entries = toggleFavorite([], japan);
    expect(entries).toEqual([japan]);
    expect(isFavorite(entries, japan)).toBe(true);
    expect(parseFavoriteEntries(JSON.stringify(entries))).toEqual(entries);
  });

  it("keeps legacy ids readable while migrating to car snapshots", () => {
    expect(parseFavoriteEntries('["42569219","banzai-1"]')).toEqual(["42569219", "banzai-1"]);
  });

  it("removes a favorite using country and id", () => {
    expect(toggleFavorite([japan], japan)).toEqual([]);
  });

  it("prefers fresh catalog data and rejects broken snapshots", () => {
    const fresh = { ...japan, priceRub: 1_650_000 };
    expect(resolveFavoriteCars([japan], [fresh])).toEqual([fresh]);
    expect(parseFavoriteEntries('[{"id":"broken","slug":"broken","country":"jp"}]')).toEqual([]);
  });
});
