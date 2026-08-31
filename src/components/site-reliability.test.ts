import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("site loading reliability", () => {
  it("lets browsers reuse unchanged public media", () => {
    const config = read("../../next.config.ts");
    expect(config).toContain('source: "/media/:path*"');
    expect(config).toContain('value: "public, max-age=86400, stale-while-revalidate=604800"');
  });

  it("streams database-backed reviews without blocking the first screen", () => {
    const home = read("../app/page.tsx");
    expect(home).toContain('import { Suspense } from "react"');
    expect(home).toContain("<Suspense fallback={null}><Testimonials /></Suspense>");
  });

  it("keeps the route animation functional and smooth without layout animation", () => {
    const journey = read("./global-journey.tsx");
    const layout = read("../app/layout.tsx");
    const home = read("../app/page.tsx");
    const orders = read("../app/orders/page.tsx");
    const css = read("../app/globals.css");

    expect(journey).toContain('"use client"');
    expect(journey).toContain("usePathname");
    expect(journey).toContain("requestAnimationFrame");
    expect(journey).toContain('addEventListener("scroll"');
    expect(journey).toContain("getPointAtLength");
    expect(journey).not.toContain("reversing");
    expect(journey).toContain("Math.atan2");
    expect(journey).toContain("+ 90");
    expect(journey).toContain("rotate(${angle})");
    expect(journey).not.toContain("rotate(360");
    expect(journey).not.toContain("car-shadow");
    expect(journey).not.toContain("journey-label");
    expect(css).not.toContain(".journey-label");
    expect(layout).toContain("<GlobalJourney />");
    expect(home).not.toContain("<GlobalJourney />");
    expect(orders).not.toContain("<GlobalJourney />");
    expect(css).not.toMatch(/\.journey-car\s*\{[^}]*transition:\s*transform/);
    expect(css).not.toMatch(/\.global-journey\.journey-started \.journey-car\s*\{[^}]*will-change:\s*transform/);
    expect(journey).toContain("const measure = () =>");
    expect(journey).toContain("const route = routeSets[mobile ? 1 : 0] ?? routeSets[0]");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.journey-car\s*\{[^}]*will-change:\s*auto/);
  });
});
