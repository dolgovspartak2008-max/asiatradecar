import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import * as externalSync from "./external-sync";

it("requires at least 50,000 unique Chinese listings from several source pools", () => {
  expect(Reflect.get(externalSync, "CHINA_MIN_UNIQUE")).toBe(50_000);
  const cities = Reflect.get(externalSync, "CHINA_SYNC_CITIES");
  expect(Array.isArray(cities)).toBe(true);
  expect(new Set(cities).size).toBeGreaterThanOrEqual(8);
});

it("keeps the current Japan cursor separate from the old auction cursor", () => {
  const source = readFileSync(new URL("./external-sync.ts", import.meta.url), "utf8");
  expect(source).toContain('"catalog_banzai_current_next_page"');
  expect(source).toContain('"catalog_banzai_current_cycle_started_epoch"');
  expect(source).toContain('"catalog_banzai_current_last_completed_epoch"');
  expect(source).not.toContain('"catalog_banzai_next_page"');
});

it("imports both current Japanese sources in one resumable daily cycle", () => {
  const source = readFileSync(new URL("./external-sync.ts", import.meta.url), "utf8");
  expect(Reflect.get(externalSync, "JAPAN_SOURCES")).toEqual(["auctions", "onePrice"]);
  expect(Reflect.get(externalSync, "JAPAN_REFRESH_SECONDS")).toBe(23 * 60 * 60);
  expect(source).toContain('"catalog_banzai_current_source_index"');
  expect(source).toContain('"catalog_banzai_current_next_page"');
  expect(source).toContain('"catalog_banzai_current_last_completed_epoch"');
  expect(source).toContain("status=EXCLUDED.status");
});

it("runs the GitHub catalog sync once per day", () => {
  const workflow = readFileSync(new URL("../../.github/workflows/catalog-sync.yml", import.meta.url), "utf8");
  expect(workflow).toContain('cron: "17 3 * * *"');
  expect(workflow).not.toContain('cron: "17 * * * *"');
  expect(workflow).toContain("/api/internal/sync?scope=japan");
  expect(workflow).toContain("completed");
});

it("offers a Japan-only sync route for resumable daily imports", () => {
  const route = readFileSync(new URL("../app/api/internal/sync/route.ts", import.meta.url), "utf8");
  expect(route).toContain('searchParams.get("scope") === "japan"');
  expect(route).toContain("syncJapanCatalog");
});
