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
  vi.mocked(query).mockResolvedValue({ rows: [{ id: "4", title: "Новый отзыв", text: "Текст" }] } as never);

  await expect(getPublishedReviews()).resolves.toEqual([{ id: "4", title: "Новый отзыв", text: "Текст" }]);
  expect(query).toHaveBeenCalledTimes(1);
  expect(String(vi.mocked(query).mock.calls[0][0])).toMatch(/^SELECT .* WHERE status='published'/);
});
