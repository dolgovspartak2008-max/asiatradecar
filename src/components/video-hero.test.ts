import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("starts one hero video natively with a visible poster fallback", () => {
  const source = readFileSync(new URL("./video-hero.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  expect(source.match(/<video\b/g)).toHaveLength(1);
  expect(source).toContain('preload="metadata"');
  expect(source).toContain('poster="/media/hero-import.webp"');
  expect(source).toContain(" autoPlay");
  expect(source).not.toContain('addEventListener("load"');
  expect(source).toContain('addEventListener("pointerdown"');
  expect(source).toContain('addEventListener("visibilitychange"');
  expect(source).not.toContain("requestAnimationFrame");
  expect(source).not.toContain("<button");
  expect(css).toContain('url("/media/hero-import.webp")');
  expect(css).not.toContain(".hero-video-toggle");
});
