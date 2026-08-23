import { beforeEach, expect, it, vi } from "vitest";
import { permanentRedirect } from "next/navigation";
import CalculatorPage from "./page";

vi.mock("next/navigation", () => ({ permanentRedirect: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(permanentRedirect).mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
});

it("redirects the removed manual calculator to cars with source prices", () => {
  expect(() => CalculatorPage()).toThrow("NEXT_REDIRECT");
  expect(permanentRedirect).toHaveBeenCalledWith("/#catalogs");
});
