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

  it("labels every catalog price as turnkey in Russia", () => {
    const breakdown = read("./price-breakdown.tsx");
    expect(read("./car-card.tsx")).toContain("Под ключ в РФ");
    expect(read("./car-card.tsx")).not.toContain("Предварительный расчёт");
    expect(read("../app/auto/[slug]/page.tsx")).toContain("Под ключ в РФ");
    expect(read("../app/auto/[slug]/page.tsx")).not.toContain("Предварительный расчёт для РФ");
    expect(breakdown).toContain("Под ключ в РФ");
    expect(breakdown).toContain('country === "jp" ? 50_000 : 100_000');
    expect(breakdown).toContain('country === "kr" ? 110_000');
  });

  it("removes wishes only from a selected-car application", () => {
    expect(read("./lead-form.tsx")).toContain("{!carName && <label>Пожелания");
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
    expect(read("./catalog-page.tsx")).toContain("<CatalogResults key={query.toString()}");
  });

  it("keeps legal headings readable on narrow screens and uses black country names", () => {
    const css = read("../app/globals.css");
    expect(css).toContain(".legal-page h1 { font-size:");
    expect(css).toContain(".country-card h3 { margin:");
    expect(css).toContain(".country-card h3 { margin: 0; color: var(--ink)");
    expect(css).toContain(".catalog-choice-list a > strong { color: var(--ink)");
    expect(css).toContain(".country-code, .country-card h3");
    expect(css).toContain(".catalog-choice-list a > span, .catalog-choice-list a > strong");
  });

  it("removes the hero motion caption and adds animated YouTube and VK links", () => {
    expect(read("./video-hero.tsx")).not.toContain("В движении");
    const footer = read("./footer.tsx");
    const site = read("../config/site.ts");
    const css = read("../app/globals.css");
    expect(site).toContain("https://youtube.com/@asiatradecar");
    expect(site).toContain("https://vk.ru/asiatradecar");
    expect(footer).toContain("site.youtube");
    expect(footer).toContain("site.vk");
    expect(css).toContain(".social-link:hover svg");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("shows complete review photos and expandable long text", () => {
    const css = read("../app/globals.css");
    const testimonials = read("./testimonials.tsx");
    expect(css).toContain(".testimonial-photo img { object-fit: contain;");
    expect(testimonials).toContain("<ReviewText");
  });

  it("brightens the moving hero and styles car names as uppercase display type", () => {
    const css = read("../app/globals.css");
    expect(css).toContain("filter: brightness(1.18)");
    expect(css).toContain("font-family: var(--font-car)");
    expect(css).toContain("text-transform: uppercase");
  });

  it("removes the source-data label and provides shared glow motion", () => {
    expect(read("./car-options.tsx")).not.toContain("Данные источника");
    const css = read("../app/globals.css");
    expect(css).toContain("@keyframes button-glow-spin");
    expect(css).toContain("@keyframes button-glow-breathe");
  });

  it("keeps the route map visible behind reviews and preserves the insurance line break", () => {
    const css = read("../app/globals.css");
    expect(css).toContain(".testimonials { background: transparent;");
    expect(css).toMatch(/\.car-specs dd \{[^}]*white-space: pre-line/);
  });

  it("keeps the catalog sync workflow valid without a secrets expression at job level", () => {
    const workflow = read("../../.github/workflows/catalog-sync.yml");
    expect(workflow).not.toContain("if: ${{ secrets.");
  });
});
