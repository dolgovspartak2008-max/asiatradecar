import { beforeEach, expect, it, vi } from "vitest";
import { hasDatabase, query } from "./db";
import { getPublishedReviews } from "./reviews";

vi.mock("./db", () => ({ hasDatabase: vi.fn(), query: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hasDatabase).mockReturnValue(true);
  vi.mocked(query).mockResolvedValue({ rows: [] } as never);
});

it("hides the two withdrawn reviews before reading published reviews", async () => {
  await getPublishedReviews();

  expect(query).toHaveBeenNthCalledWith(1, "UPDATE reviews SET status='hidden' WHERE id=ANY($1::bigint[])", [[1, 3]]);
  expect(String(vi.mocked(query).mock.calls[1][0])).toContain("WHERE status='published'");
});
