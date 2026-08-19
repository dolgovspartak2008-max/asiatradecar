import { beforeEach, expect, it, vi } from "vitest";
import { connection } from "next/server";
import { getCalculatorRates } from "@/server/rates";
import CalculatorPage from "./page";

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/server/rates", () => ({ getCalculatorRates: vi.fn() }));
vi.mock("@/components/calculator", () => ({ Calculator: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(connection).mockResolvedValue();
});

it("waits for an incoming request before reading database rates", async () => {
  vi.mocked(getCalculatorRates).mockResolvedValue({ krwToRub: 0.059, eurToRub: 92, date: null, isFallback: true });

  await CalculatorPage();

  expect(connection).toHaveBeenCalledOnce();
  expect(vi.mocked(connection).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(getCalculatorRates).mock.invocationCallOrder[0]);
});
