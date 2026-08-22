import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("requested mobile UI", () => {
  it("opens one shared country chooser from both catalog CTAs", () => {
    expect(read("../app/page.tsx")).toContain("<CatalogChooser");
    expect(read("../app/orders/page.tsx")).toContain("<CatalogChooser");
  });

  it("shows vehicle commercial details before specifications and removes source availability copy", () => {
    const source = read("../app/auto/[slug]/page.tsx");
    expect(source.indexOf("car-sidebar")).toBeLessThan(source.indexOf("car-specs"));
    expect(source).not.toContain("В наличии у источника");
  });

  it("does not render price breakdown controls inside catalog cards", () => {
    const source = read("./car-card.tsx");
    expect(source).not.toContain("PriceBreakdown");
    expect(source).not.toContain("Расшифровка цены");
  });

  it("offers call, Telegram and WhatsApp for each manager without MAX", () => {
    const source = read("./footer.tsx");
    expect(source).toContain("Позвонить");
    expect(source).toContain("Telegram");
    expect(source).toContain("WhatsApp");
    expect(source).not.toContain("MAX");
  });
});
