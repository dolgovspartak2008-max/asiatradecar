import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "@/config/site";

describe("resolveSiteUrl", () => {
  it("prefers the configured public URL", () => {
    expect(resolveSiteUrl({ SITE_URL: "https://custom.example", VERCEL_PROJECT_PRODUCTION_URL: "project.vercel.app" })).toBe("https://custom.example");
  });

  it("uses the Vercel production domain when SITE_URL is absent", () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "project.vercel.app" })).toBe("https://project.vercel.app");
  });

  it("falls back to localhost outside Vercel", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });
});
