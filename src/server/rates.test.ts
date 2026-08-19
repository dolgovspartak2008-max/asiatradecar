import { beforeEach, expect, it, vi } from "vitest";
import { hasDatabase, query } from "@/server/db";
import { getCalculatorRates } from "./rates";

vi.mock("@/server/db", () => ({ hasDatabase: vi.fn(), query: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

it("uses fallback rates when the configured database is unavailable", async () => {
  vi.mocked(hasDatabase).mockReturnValue(true);
  vi.mocked(query).mockRejectedValue(new Error("database unavailable"));

  await expect(getCalculatorRates()).resolves.toEqual({
    krwToRub: 0.059,
    eurToRub: 92,
    date: null,
    isFallback: true
  });
});
