import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import * as externalSync from "./external-sync";

it("requires at least 50,000 unique Chinese listings from several source pools", () => {
  expect(Reflect.get(externalSync, "CHINA_MIN_UNIQUE")).toBe(50_000);
  const cities = Reflect.get(externalSync, "CHINA_SYNC_CITIES");
  expect(Array.isArray(cities)).toBe(true);
  expect(new Set(cities).size).toBeGreaterThanOrEqual(8);
});

it("keeps the Japan archive cursor separate from the old auction cursor", () => {
  const source = readFileSync(new URL("./external-sync.ts", import.meta.url), "utf8");
  expect(source).toContain('"catalog_banzai_archive_next_page"');
  expect(source).toContain('"catalog_banzai_archive_cycle_started_epoch"');
  expect(source).toContain('"catalog_banzai_archive_last_completed_epoch"');
  expect(source).not.toContain('"catalog_banzai_next_page"');
});
