import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

it("ships indexable country catalog routes without previous and next controls", () => {
  expect(existsSync(new URL("../app/catalog/[market]/page.tsx", import.meta.url))).toBe(true);
  const results = read("./catalog-results.tsx");
  expect(results).not.toContain("previousHref");
  expect(results).not.toContain("nextHref");
  expect(results).not.toContain("Предыдущая страница");
  expect(results).not.toContain("Следующая страница");
});

it("identifies the Japanese inventory as the Banzai24 trade archive", () => {
  expect(read("../domain/seo.ts")).toContain("архиву торгов Banzai24");
});

it("covers the iPhone safe area with the dark hero background and a full-button glow", () => {
  const layout = read("../app/layout.tsx");
  const css = read("../app/globals.css");
  expect(layout).toContain('viewportFit: "cover"');
  expect(css).toMatch(/html, body\s*\{[^}]*background:\s*var\(--dark\)/);
  expect(css).toMatch(/\.button::before\s*\{[^}]*inset:\s*0[^}]*border-radius:\s*inherit/);
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
  const gallery = read("./car-gallery.tsx");
  expect(gallery).not.toContain("unoptimized");
  expect(gallery).toContain('loading="eager"');
  expect(gallery).not.toContain(" priority");
});

it("publishes the requested search title, description and logo", () => {
  const layout = read("../app/layout.tsx");
  const site = read("../config/site.ts");
  expect(layout).toContain('default: "ASIA TRADE CAR — Автомобили из-за рубежа"');
  expect(site).toContain('description: "Подбор и доставка автомобилей из зарубежных стран. Полное сопровождение сделки. Низкие цены."');
  expect(existsSync(new URL("../app/icon.png", import.meta.url))).toBe(true);
  expect(layout).not.toContain('icons: { icon: "data:image/svg+xml');
});

it("revalidates the homepage instead of forcing uncached rendering", () => {
  const source = read("../app/page.tsx");
  expect(source).toContain("export const revalidate = 3600");
  expect(source).not.toContain('dynamic = "force-dynamic"');
});
