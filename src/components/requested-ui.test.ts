import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("requested mobile UI", () => {
  it("uses the requested hero copy and routes catalog entry points through country choice", () => {
    const home = read("../app/page.tsx");
    const header = read("./header.tsx");
    const orders = read("../app/orders/page.tsx");
    expect(home).toContain("Импорт автомобилей");
    expect(home).toContain("из-за рубежа");
    expect(header).not.toContain('["Каталог", "/catalog?country=kr"]');
    expect(orders).not.toContain('href="/catalog?country=kr"');
  });

  it("opens one shared country chooser from both catalog CTAs", () => {
    expect(read("../app/page.tsx")).toContain("<CatalogChooser");
    expect(read("../app/orders/page.tsx")).toContain("<CatalogChooser");
  });

  it("shows vehicle commercial details before specifications and removes source availability copy", () => {
    const source = read("../app/auto/[slug]/page.tsx");
    expect(source.indexOf("car-detail-title")).toBeLessThan(source.indexOf("car-gallery-area"));
    expect(source.indexOf("car-sidebar")).toBeLessThan(source.indexOf("car-specs"));
    expect(source).not.toContain("В наличии у источника");
    expect(source).not.toContain("formatKrw");
    expect(source).not.toContain("source-car-price");
    expect(source).toContain("car.sourceUrl");
  });

  it("does not render price breakdown controls inside catalog cards", () => {
    const source = read("./car-card.tsx");
    expect(source).not.toContain("PriceBreakdown");
    expect(source).not.toContain("Расшифровка цены");
    expect(source).toContain("`/auto/${car.slug}`");
    expect(source).not.toContain("const href = car.sourceUrl");
  });

  it("routes the header phone fallback to contacts", () => {
    expect(read("./header.tsx")).toContain('"/#contacts"');
  });

  it("labels external-market prices as preliminary instead of turnkey", () => {
    const breakdown = read("./price-breakdown.tsx");
    expect(read("./car-card.tsx")).toContain("Предварительный расчёт");
    expect(read("../app/auto/[slug]/page.tsx")).toContain("Предварительный расчёт для РФ");
    expect(breakdown).toContain('country === "jp" ? 50_000 : 100_000');
    expect(breakdown).toContain('country === "kr" ? 110_000');
  });

  it("offers call, Telegram and WhatsApp for each manager without MAX", () => {
    const source = read("./footer.tsx");
    expect(source).toContain("Позвонить");
    expect(source).toContain("Telegram");
    expect(source).toContain("WhatsApp");
    expect(source).toContain("https://t.me/artur_sagitov02");
    expect(source).toContain("https://t.me/Oleg_Ohty");
    expect(source).toContain("https://t.me/pavel_platonov290989");
    expect(source).not.toContain("MAX");
  });

  it("remounts catalog results after filters change", () => {
    expect(read("../app/catalog/page.tsx")).toContain("<CatalogResults key={query.toString()}");
  });

  it("keeps legal headings readable on narrow screens and highlights country names", () => {
    const css = read("../app/globals.css");
    expect(css).toContain(".legal-page h1 { font-size:");
    expect(css).toContain(".country-card h3 { margin:");
    expect(css).toContain("color: #f2b321");
  });

  it("keeps the catalog sync workflow valid without a secrets expression at job level", () => {
    const workflow = read("../../.github/workflows/catalog-sync.yml");
    expect(workflow).not.toContain("if: ${{ secrets.");
  });
});
