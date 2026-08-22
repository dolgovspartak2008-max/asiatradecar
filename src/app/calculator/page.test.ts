import { beforeEach, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import CalculatorPage from "./page";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(redirect).mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
});

it("redirects the removed manual calculator to cars with source prices", () => {
  expect(() => CalculatorPage()).toThrow("NEXT_REDIRECT");
  expect(redirect).toHaveBeenCalledWith("/#catalogs");
});
