import { existsSync, readFileSync } from "node:fs";
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
    expect(breakdown).toContain("parseCostBreakdown");
    expect(breakdown).not.toContain("DEFAULT_COMMISSIONS_RUB");
  });

  it("uses native request anchors for reliable desktop and mobile scrolling", () => {
    const home = read("../app/page.tsx");
    const header = read("./header.tsx");
    expect(header).toContain('<a className="button button-small" href="/#request">Подобрать авто</a>');
    expect(home).toContain('<a className="button" href="#request">Получить подбор</a>');
    expect(home).toContain('<a className="button" href="#request">Получить расчёт</a>');
  });

  it("moves the secondary catalog disclaimer below the results", () => {
    const source = read("./catalog-page.tsx");
    expect(source.indexOf("catalog-intro")).toBeGreaterThan(source.indexOf("<CatalogResults"));
  });

  it("removes wishes only from a selected-car application", () => {
    expect(read("./lead-form.tsx")).toContain("{!carName && <label>Пожелания");
  });

  it("offers manager contacts plus Instagram and MAX company links", () => {
    const source = read("./footer.tsx");
    const site = read("../config/site.ts");
    expect(source).toContain("Позвонить");
    expect(source).toContain("Telegram");
    expect(source).toContain("WhatsApp");
    expect(source).toContain("https://t.me/artur_sagitov02");
    expect(source).toContain("https://t.me/Oleg_Ohty");
    expect(source).toContain("https://t.me/pavel_platonov290989");
    expect(source).toContain("https://max.ru/u/f9LHodD0cOItMxlXXoEhaybALvGJ3YHEVRIOiPMzHsHN-P59s2x9ukGHEBU");
    expect(source).toContain("https://max.ru/u/f9LHodD0cOJiC9iSnfthYjRc63mxfjhHS-qPgrtfGO_u8Mvj2R981pbNip8");
    expect(source).toContain("https://max.ru/u/f9LHodD0cOJ3oEukbK_sITK0UPK7Ubgv_FnXYP4WsAg0bUr0mJFtePlS4J0");
    expect(source).toContain("href={manager.max}");
    expect(site).toContain("https://www.instagram.com/asiatradecar");
    expect(site).toContain("https://max.ru/channel_asiatradecar");
    expect(source).toContain("site.instagram");
    expect(source).toContain("site.max");
  });

  it("orders company social links as Telegram, MAX, VK, YouTube, Instagram", () => {
    const source = read("./footer.tsx");
    expect(source.indexOf("site.telegram")).toBeLessThan(source.indexOf("site.max"));
    expect(source.indexOf("site.max")).toBeLessThan(source.indexOf("site.vk"));
    expect(source.indexOf("site.vk")).toBeLessThan(source.indexOf("site.youtube"));
    expect(source.indexOf("site.youtube")).toBeLessThan(source.indexOf("site.instagram"));
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

  it("shows only photo reviews in equal-height cards", () => {
    const testimonials = read("./testimonials.tsx");
    const css = read("../app/globals.css");
    expect(testimonials).toContain("getPublishedReviews");
    expect(testimonials).toContain("filter((review) => review.image)");
    expect(testimonials).toContain("if (!reviews.length) return null");
    expect(testimonials).toContain("<ReviewText");
    expect(testimonials).toContain("!/^Отзыв \\d+$/u.test(review.title)");
    expect(testimonials).not.toContain("Lexus RX 300");
    expect(css).toMatch(/\.testimonial-grid\s*\{[^}]*align-items:\s*stretch/);
    expect(css).toMatch(/\.testimonial-card\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column/);
  });

  it("opens the supplied delivery price table from the mobile menu", () => {
    const home = read("../app/page.tsx");
    const menu = read("./mobile-menu.tsx");
    const dialog = read("./delivery-prices-dialog.tsx");
    expect(home).not.toContain("DeliveryPricesDialog");
    expect(menu).toContain("<DeliveryPricesDialog />");
    expect(menu.indexOf("<DeliveryPricesDialog />")).toBeGreaterThan(menu.indexOf("Мобильная навигация"));
    expect(dialog).toContain("Цена доставки по России");
    expect(dialog).toContain("Цены доставки по России");
    expect(dialog).toContain("/media/delivery-prices.png");
    expect(dialog).not.toContain('loading="eager"');
    expect(dialog).toContain("<table>");
    expect(dialog).toContain('className="delivery-prices-mobile"');
    expect(dialog.match(/\["[^"]+", \d+_\d{3}, \d+_\d{3}, \d+_\d{3}, \d+_\d{3}\]/g)).toHaveLength(26);
    expect(existsSync(new URL("../../public/media/delivery-prices.png", import.meta.url))).toBe(true);
  });

  it("shows every mobile menu destination in the desktop navigation", () => {
    const header = read("./header.tsx");
    const css = read("../app/globals.css");
    expect(header).toContain('["Избранное", "/catalog/favorites"]');
    expect(header).toContain("<DeliveryPricesDialog />");
    expect(header.indexOf("<DeliveryPricesDialog />")).toBeGreaterThan(header.indexOf('className="desktop-nav"'));
    expect(css).toMatch(/\.desktop-nav \.delivery-prices-trigger\s*\{[^}]*display:\s*inline-flex[^}]*align-items:\s*center/);
    expect(css).toMatch(/\.desktop-nav \.delivery-prices-trigger svg\s*\{[^}]*display:\s*none/);
  });

  it("centers catalog codes and country names vertically", () => {
    const css = read("../app/globals.css");
    expect(css).toMatch(/\.catalog-choice-list a \{[^}]*align-items: center/);
    expect(css).toMatch(/\.country-card-copy\s*\{[^}]*position:\s*relative/);
    expect(css).toMatch(/\.country-card-pending\s*\{[^}]*position:\s*absolute/);
  });

  it("opens the catalog chooser from empty favorites without changing the button", () => {
    const favorites = read("./favorites-grid.tsx");
    expect(favorites).toContain('import { CatalogChooser } from "@/components/catalog-chooser"');
    expect(favorites).toContain('<CatalogChooser label="Перейти в каталог" showIcon={false} />');
    expect(favorites).not.toContain('href="/catalog/korea"');
  });

  it("shows the complete header logo without vertical cropping", () => {
    const css = read("../app/globals.css");
    expect(css).toMatch(/\.logo \{[^}]*height:\s*68px/);
    expect(css).not.toMatch(/\.logo img \{[^}]*translateY/);
  });

  it("shows a compact ruble insurance summary beside catalog metadata", () => {
    const card = read("./car-card.tsx");
    expect(card).toContain("readInsuranceSummary");
    expect(card).toContain("car-insurance-summary");
    expect(card).not.toContain("страховой случай");
  });

  it("matches Encar insurance styling and shows fuel only for Korean cars", () => {
    const card = read("./car-card.tsx");
    const icons = read("./icons.tsx");
    const css = read("../app/globals.css");
    expect(card).toContain('<Icon name="collision" size={14} />');
    expect(card).toContain('car.country === "kr" && car.fuel');
    expect(card).toContain("<span>{car.fuel}</span>");
    expect(icons).toContain('"collision"');
    expect(css).toMatch(/\.car-insurance-summary\s*\{[^}]*color:\s*#fff[^}]*background:\s*#d90a3d/);
  });

  it("restores the loaded catalog and exact scroll position after viewing a car", () => {
    const results = read("./catalog-results.tsx");
    const card = read("./car-card.tsx");
    expect(results).toContain("sessionStorage");
    expect(results).toContain("scrollY");
    expect(results).toContain("saved.cars");
    expect(results).toContain("onOpen={rememberPosition}");
    expect(card).toContain("onOpen?: () => void");
    expect(card.match(/onClick=\{onOpen\}/g)).toHaveLength(2);
    expect(results).toContain('const stateFrame = requestAnimationFrame(() => {\n        sessionStorage.removeItem(CATALOG_RETURN_KEY);');
  });

  it("does not add a source calculation adjustment to price breakdowns", () => {
    expect(read("./price-breakdown.tsx")).not.toContain("reconcileCostBreakdown");
    expect(read("../domain/car-details.ts")).not.toContain("Корректировка расчёта источника");
  });

  it("shows one loading message in the same place for every catalog entry point", () => {
    const page = read("../app/catalog/[market]/page.tsx");
    const chooser = read("./catalog-chooser.tsx");
    const home = read("../app/page.tsx");
    const status = read("./catalog-link-status.tsx");
    expect(status).toContain("useLinkStatus");
    expect(status).toContain("Пожалуйста, подождите");
    expect(status).toContain("function CatalogLinkStatus");
    expect(chooser).toContain("<CatalogLinkStatus");
    expect(chooser).not.toContain('country.code === "JP" &&');
    expect(home.match(/<CatalogLinkStatus className="country-card-pending" \/>/g)).toHaveLength(3);
    expect(page).not.toContain("Пожалуйста, подождите");
    expect(page).not.toContain("<Suspense");
  });

  it("keeps all catalog chooser rows the same height", () => {
    const css = read("../app/globals.css");
    expect(css).toMatch(/\.catalog-choice-list a\s*\{[^}]*position:\s*relative/);
    expect(css).toMatch(/\.catalog-choice-pending\s*\{[^}]*position:\s*absolute/);
    expect(css).not.toMatch(/\.catalog-choice-pending\s*\{[^}]*grid-column/);
  });

  it("replaces a failed catalog photo with the local placeholder", () => {
    const card = read("./car-card.tsx");
    expect(card).toContain("onError");
    expect(card).toContain("setImageFailed(true)");
    expect(card).toContain("Фото обновляется");
  });

  it("removes failed photos from the detail gallery", () => {
    const gallery = read("./car-gallery.tsx");
    expect(gallery).toContain("onError");
    expect(gallery).toContain("removePhoto");
    expect(gallery).toContain("Фотографии обновляются из источника");
  });

  it("opens the active car photo in a full-screen dialog", () => {
    const gallery = read("./car-gallery.tsx");
    const css = read("../app/globals.css");
    expect(gallery).toContain("showModal()");
    expect(gallery).toContain('className="car-photo-dialog"');
    expect(gallery).toContain("Закрыть полноэкранное фото");
    expect(gallery).toContain('sizes="100vw" loading="eager"');
    expect(css).toContain(".car-photo-dialog");
  });

  it("uses a readable stacked delivery list on phones", () => {
    const css = read("../app/globals.css");
    expect(css).toContain(".delivery-prices-mobile { display: none;");
    expect(css).toMatch(/@media \(max-width: 540px\)[\s\S]*\.delivery-prices-mobile \{ display: grid;/);
    expect(css).toMatch(/\.delivery-prices-panel\s*\{[^}]*overflow-x:\s*hidden/);
    expect(css).toMatch(/\.delivery-prices-mobile li\s*\{[^}]*display:\s*block/);
    expect(css).toMatch(/\.delivery-prices-mobile dl > div\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto/);
    expect(css).toMatch(/\.delivery-prices-mobile h3\s*\{[^}]*color:\s*var\(--ink\)/);
    expect(css).toMatch(/\.delivery-prices-mobile dd\s*\{[^}]*color:\s*var\(--ink\)/);
    expect(css).not.toContain(".responsibility .delivery-prices-mobile");
    expect(css).not.toContain(".delivery-prices-image img { width: 760px;");
  });

  it("locks the page and contains scroll inside open dialogs", () => {
    const css = read("../app/globals.css");
    expect(css).toContain("html:has(dialog[open])");
    expect(css).toContain("body:has(dialog[open])");
    expect(css).toMatch(/\.dialog-panel\s*\{[^}]*overscroll-behavior:\s*contain/);
    expect(css).toMatch(/\.catalog-choice-panel\s*\{[^}]*overflow-y:\s*auto[^}]*overscroll-behavior:\s*contain/);
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
    expect(css).toContain("@keyframes button-glow-fill");
    expect(css).toContain("@keyframes button-glow-breathe");
  });

  it("keeps the route map visible behind reviews and preserves the insurance line break", () => {
    const css = read("../app/globals.css");
    expect(css).toContain(".testimonials { background: transparent;");
    expect(css).toMatch(/\.car-specs dd \{[^}]*white-space: pre-line/);
  });

  it("separates Ekaterinburg and Novosibirsk labels on the mobile route", () => {
    const mobile = read("./global-journey.tsx").split('<g className="journey-mobile"')[1];
    expect(mobile).toContain('<text x="570" y="198">Екатеринбург</text>');
    expect(mobile).toContain('<text x="625" y="278">Новосибирск</text>');
  });

  it("keeps the catalog sync workflow valid without a secrets expression at job level", () => {
    const workflow = read("../../.github/workflows/catalog-sync.yml");
    expect(workflow).not.toContain("if: ${{ secrets.");
  });

  it("returns missing Japanese and Chinese cars to their own catalogs", () => {
    const source = read("../app/auto/[slug]/not-found.tsx");
    expect(source).toContain("usePathname");
    expect(source).toContain('slug.startsWith("jp-") ? "japan"');
    expect(source).toContain('slug.startsWith("cn-") ? "china"');
    expect(source).toContain('href={`/catalog/${market}`}');
  });
});
