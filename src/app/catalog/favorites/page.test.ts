import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

it("renders favorites statically from saved browser data", () => {
  expect(source).not.toContain("connection");
  expect(source).not.toContain("getCatalog");
  expect(source).toContain("<FavoritesGrid />");
});
