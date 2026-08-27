import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { telegramReviewSeeds } from "./telegram-reviews";

describe("imported Telegram reviews", () => {
  it("keeps all requested reviews and uses no media for posts without photos", () => {
    expect(telegramReviewSeeds).toHaveLength(29);
    expect(new Set(telegramReviewSeeds.map((review) => review.telegramFileId)).size).toBe(29);
    expect(telegramReviewSeeds.filter((review) => review.image === null).map((review) => review.telegramFileId)).toEqual([
      "telegram-import:2217",
      "telegram-import:2224",
      "telegram-import:2339",
      "telegram-import:2360",
    ]);
  });

  it("references an existing optimized WebP for every review with a source photo", () => {
    const images = telegramReviewSeeds.flatMap((review) => review.image ? [review.image] : []);
    expect(images).toHaveLength(25);
    expect(images.every((image) => image.endsWith(".webp") && existsSync(new URL(`../../public${image}`, import.meta.url)))).toBe(true);
  });
});
