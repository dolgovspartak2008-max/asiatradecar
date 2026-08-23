import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

it("ships indexable country catalog routes and crawlable pagination", () => {
  expect(existsSync(new URL("../app/catalog/[market]/page.tsx", import.meta.url))).toBe(true);
  const results = read("./catalog-results.tsx");
  expect(results).toContain("previousHref");
  expect(results).toContain("nextHref");
  expect(results).toContain("<Link");
});

it("builds sitemap from active inventory instead of legal or query URLs", () => {
  const source = read("../app/sitemap.ts");
  expect(source).toContain("getSitemapCars");
  expect(source).toContain("buildSitemapEntries");
  expect(source).not.toContain("/legal/");
  expect(source).not.toContain("?country=");
});

it("uses rich Product and Organization schema from visible facts", () => {
  expect(read("../app/auto/[slug]/page.tsx")).toContain("buildVehicleSchema");
  expect(read("../app/page.tsx")).toContain("buildOrganizationSchema");
});

it("backs customs and vehicle-document guidance with primary sources", () => {
  const source = read("../app/orders/page.tsx");
  expect(source).toContain("cpt.customs.gov.ru/fiz/transportnye-sredstva-");
  expect(source).toContain("https://elpts.ru/");
});

it("uses optimized local media and Next image optimization", () => {
  expect(existsSync(new URL("../../public/media/hero-import.webp", import.meta.url))).toBe(true);
  expect(existsSync(new URL("../../public/media/reviews/volkswagen-sagitar.webp", import.meta.url))).toBe(true);
  expect(read("./logo.tsx")).toContain("asia-trade-car-logo-transparent.webp");
  expect(read("./car-card.tsx")).not.toContain("unoptimized");
  expect(read("./car-gallery.tsx")).not.toContain("unoptimized");
});

it("revalidates the homepage instead of forcing uncached rendering", () => {
  const source = read("../app/page.tsx");
  expect(source).toContain("export const revalidate = 3600");
  expect(source).not.toContain('dynamic = "force-dynamic"');
});
