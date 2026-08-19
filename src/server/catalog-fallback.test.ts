import { afterEach, expect, it, vi } from "vitest";
import { query } from "./db";
import { getCarBySlug } from "./catalog";

vi.mock("./db", () => ({ hasDatabase: () => true, query: vi.fn() }));

afterEach(() => vi.unstubAllGlobals());

it("returns no car when both the live source and configured database are unavailable", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));
  vi.mocked(query).mockRejectedValue(new Error("database unavailable"));

  await expect(getCarBySlug("kia-sportage-42569219")).resolves.toBeNull();
});
