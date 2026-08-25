import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchBanzaiImage } from "@/server/banzai";
import { GET } from "./route";

vi.mock("@/server/banzai", () => ({ fetchBanzaiImage: vi.fn() }));

beforeEach(() => vi.mocked(fetchBanzaiImage).mockReset());

describe("Banzai image proxy", () => {
  it("streams a protected image with a public cache policy", async () => {
    vi.mocked(fetchBanzaiImage).mockResolvedValue(new Response("image", { status: 200, headers: { "content-type": "image/webp" } }));

    const response = await GET(new Request("https://example.test"), { params: Promise.resolve({ token: "v2_token-1" }) });

    expect(fetchBanzaiImage).toHaveBeenCalledWith("v2_token-1");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toContain("s-maxage=86400");
  });

  it("rejects tokens outside the fixed Banzai image path", async () => {
    const response = await GET(new Request("https://example.test"), { params: Promise.resolve({ token: "../secret" }) });

    expect(response.status).toBe(400);
    expect(fetchBanzaiImage).not.toHaveBeenCalled();
  });
});
