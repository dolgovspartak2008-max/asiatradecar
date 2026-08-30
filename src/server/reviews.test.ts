import { beforeEach, expect, it, vi } from "vitest";
import { hasDatabase, query } from "./db";
import { getPublishedReviews } from "./reviews";

vi.mock("./db", () => ({ hasDatabase: vi.fn(), query: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hasDatabase).mockReturnValue(true);
  vi.mocked(query).mockResolvedValue({ rows: [] } as never);
});

it("reads only published reviews without mutating stored reviews", async () => {
  vi.mocked(query).mockResolvedValue({ rows: [{ id: "4", title: "Новый отзыв", text: "Текст", telegram_file_id: "photo-4" }] } as never);

  await expect(getPublishedReviews()).resolves.toEqual([{ id: "4", title: "Новый отзыв", text: "Текст", image: "/api/reviews/4/image" }]);
  expect(query).toHaveBeenCalledTimes(1);
  expect(String(vi.mocked(query).mock.calls[0][0])).toMatch(/^SELECT .* WHERE status='published'/);
});

it("keeps imported text-only Telegram reviews free from video thumbnails", async () => {
  vi.mocked(query).mockResolvedValue({ rows: [{ id: "21", title: "Отзыв 21", text: "Текст", telegram_file_id: "telegram-import:2217" }] } as never);

  await expect(getPublishedReviews()).resolves.toEqual([{ id: "21", title: "Отзыв 21", text: "Текст", image: null }]);
});

it("uses the selected optimized asset for imported photo reviews", async () => {
  vi.mocked(query).mockResolvedValue({ rows: [{ id: "20", title: "Отзыв 20", text: "Текст", telegram_file_id: "telegram-import:2210" }] } as never);

  await expect(getPublishedReviews()).resolves.toEqual([{ id: "20", title: "Отзыв 20", text: "Текст", image: "/media/reviews/telegram-2210.webp" }]);
});

it("shows the original reviews when the local database is not configured", async () => {
  vi.mocked(hasDatabase).mockReturnValue(false);

  const reviews = await getPublishedReviews();

  expect(reviews).toHaveLength(5);
  expect(reviews.map(({ title, image }) => ({ title, image }))).toEqual([
    { title: "Lexus RX 300", image: "/media/reviews/lexus-rx300.webp" },
    { title: "Toyota Corolla", image: "/media/reviews/toyota-corolla.webp" },
    { title: "Changan", image: "/media/reviews/changan.webp" },
    { title: "Hyundai Tucson", image: "/media/reviews/hyundai-tucson.webp" },
    { title: "Volkswagen Sagitar", image: "/media/reviews/volkswagen-sagitar.webp" }
  ]);
  expect(query).not.toHaveBeenCalled();
});

it("keeps reviews visible during a temporary database failure", async () => {
  vi.mocked(query).mockRejectedValue(new Error("database unavailable"));

  await expect(getPublishedReviews()).resolves.toHaveLength(5);
});
