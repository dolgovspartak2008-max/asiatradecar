import { beforeEach, expect, it, vi } from "vitest";
import { connection } from "next/server";
import { getCatalog } from "@/server/catalog";
import FavoritesPage from "./page";

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/server/catalog", () => ({ getCatalog: vi.fn() }));
vi.mock("@/components/favorites-grid", () => ({ FavoritesGrid: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(connection).mockResolvedValue();
});

it("waits for an incoming request before loading favorites", async () => {
  vi.mocked(getCatalog).mockResolvedValue({ cars: [], total: 0, makes: [] });

  await FavoritesPage();

  expect(connection).toHaveBeenCalledOnce();
  expect(vi.mocked(connection).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(getCatalog).mock.invocationCallOrder[0]);
});

it("keeps favorites available when the live catalog times out", async () => {
  vi.mocked(getCatalog).mockRejectedValue(new DOMException("The operation was aborted due to timeout", "TimeoutError"));

  await expect(FavoritesPage()).resolves.toBeDefined();
});
