import { describe, expect, it } from "vitest";
import { mergeCatalogCars, walkCursorPages } from "./pagination";

describe("walkCursorPages", () => {
  it("processes every page until the feed has no next cursor", async () => {
    const received: number[] = [];
    const pages = new Map<string | undefined, { items: number[]; nextCursor?: string | null }>([
      [undefined, { items: [1, 2], nextCursor: "page-2" }],
      ["page-2", { items: [3], nextCursor: "page-3" }],
      ["page-3", { items: [4, 5], nextCursor: null }]
    ]);
    const result = await walkCursorPages((cursor) => Promise.resolve(pages.get(cursor)!), async (items) => { received.push(...items); });
    expect(received).toEqual([1, 2, 3, 4, 5]);
    expect(result).toEqual({ pages: 3, received: 5 });
  });

  it("stops a feed with a repeated cursor", async () => {
    await expect(walkCursorPages(async () => ({ items: [1], nextCursor: "same" }), async () => undefined)).rejects.toThrow("повторяющийся cursor");
  });

  it("prefetches the next page while the current page is stored", async () => {
    let secondPageRequested = false;
    await walkCursorPages(
      async (cursor) => {
        if (cursor === "page-2") secondPageRequested = true;
        return cursor ? { items: [2], nextCursor: null } : { items: [1], nextCursor: "page-2" };
      },
      async (_items, page) => {
        if (page === 1) expect(secondPageRequested).toBe(true);
      }
    );
  });

  it("merges catalog pages without duplicate IDs or VINs and keeps the better card", () => {
    const current = [
      { id: "1", vin: "MCAPJ9*****A08891", priceRub: null, photos: [], year: 2027, mileageKm: 15_000 },
      { id: "2", vin: null, priceRub: 2_000_000, photos: ["2.jpg"], year: 2022, mileageKm: 30_000 }
    ];
    const next = [
      { id: "3", vin: "MCAPJ9*****A08891", priceRub: 3_000_000, photos: ["3.jpg"], year: 2027, mileageKm: 15_000 },
      { id: "2", vin: null, priceRub: 2_000_000, photos: ["2.jpg"], year: 2022, mileageKm: 30_000 }
    ];

    expect(mergeCatalogCars(current, next, "newest").map((car) => car.id)).toEqual(["3", "2"]);
  });

  it("puts priced cars with photos first and unknown prices at the end", () => {
    const cars = [
      { id: "no-price", vin: null, priceRub: null, photos: ["a.jpg"], year: 2026, mileageKm: 1 },
      { id: "no-photo", vin: null, priceRub: 1_000_000, photos: [], year: 2026, mileageKm: 1 },
      { id: "zero-price", vin: null, priceRub: 0, photos: ["zero.jpg"], year: 2026, mileageKm: 1 },
      { id: "empty-photo", vin: null, priceRub: 900_000, photos: [""], year: 2026, mileageKm: 1 },
      { id: "ready-expensive", vin: null, priceRub: 3_000_000, photos: ["b.jpg"], year: 2026, mileageKm: 1 },
      { id: "ready-cheap", vin: null, priceRub: 2_000_000, photos: ["c.jpg"], year: 2026, mileageKm: 1 }
    ];

    expect(mergeCatalogCars([], cars, "price-asc").map((car) => car.id)).toEqual([
      "ready-cheap", "ready-expensive", "empty-photo", "no-photo", "no-price", "zero-price"
    ]);
  });

  it("keeps the newest equally complete record when duplicate VINs overlap pages", () => {
    const older = { id: "older", vin: "VIN-123", priceRub: 2_000_000, photos: ["old.jpg"], year: 2024, mileageKm: 10_000, details: { tradeDate: "2026-08-20" } };
    const newer = { ...older, id: "newer", photos: ["new.jpg"], details: { tradeDate: "2026-08-27" } };

    expect(mergeCatalogCars([older], [newer], "price-asc")).toEqual([newer]);
  });
});
