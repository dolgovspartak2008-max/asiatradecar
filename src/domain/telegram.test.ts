import { describe, expect, it } from "vitest";
import { parseAdminValue } from "./telegram";

describe("telegram admin input", () => {
  it("accepts spaced decimal values", () => {
    expect(parseAdminValue("100 000")).toBe(100_000);
    expect(parseAdminValue("0,059")).toBe(0.059);
  });

  it("rejects non-positive values", () => {
    expect(parseAdminValue("0")).toBeNull();
    expect(parseAdminValue("текст")).toBeNull();
  });
});
