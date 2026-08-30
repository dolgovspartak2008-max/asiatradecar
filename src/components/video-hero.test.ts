import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("loads one hero video only after the page is ready", () => {
  const source = readFileSync(new URL("./video-hero.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  expect(source.match(/<video\b/g)).toHaveLength(1);
  expect(source).toContain('preload="none"');
  expect(source).toContain('poster="/media/hero-import.webp"');
  expect(source).not.toContain(" autoPlay");
  expect(source).toContain('addEventListener("load"');
  expect(source).toContain('addEventListener("visibilitychange"');
  expect(source).not.toContain("requestAnimationFrame");
  expect(source).not.toContain("<button");
  expect(css).not.toContain(".hero-video-toggle");
});
