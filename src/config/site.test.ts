import { describe, expect, it } from "vitest";
import { isSiteIndexable, resolveSiteUrl } from "@/config/site";

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

  it("uses the canonical domain for a self-hosted production build", () => {
    expect(resolveSiteUrl({ NODE_ENV: "production" })).toBe("https://www.asiatradecar.ru");
  });
});

describe("isSiteIndexable", () => {
  it("indexes a public production URL without unrelated legal env flags", () => {
    expect(isSiteIndexable({ SITE_URL: "https://www.asiatradecar.ru" })).toBe(true);
  });

  it("indexes a self-hosted production build without Vercel variables", () => {
    expect(isSiteIndexable({ NODE_ENV: "production" })).toBe(true);
  });

  it("keeps local and explicitly disabled deployments out of the index", () => {
    expect(isSiteIndexable({ SITE_URL: "http://localhost:3000" })).toBe(false);
    expect(isSiteIndexable({ SITE_URL: "https://www.asiatradecar.ru", SITE_INDEXING_DISABLED: "true" })).toBe(false);
  });
});
