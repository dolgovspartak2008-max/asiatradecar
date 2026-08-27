import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchBanzaiPage } from "./banzai";

describe("Banzai24 session", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("bootstraps a cookie before calling the catalog API", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("ok", { status: 200, headers: { "set-cookie": "banzai_session=live; Path=/; HttpOnly" } }))
      .mockResolvedValueOnce(Response.json({
        items: [{ id: "4e75d2d8-0865-4c72-9bcc-5ddc11bca111", car: { mark: "Toyota", model: "Prius" }, characteristics: { year: "2022" }, onePrice: 1_250_000 }],
        pagination: { total: 86_781, totalPages: 868 }
      }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchBanzaiPage(1);

    expect(result.total).toBe(86_781);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://banzai24.com/", expect.any(Object));
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ Cookie: "banzai_session=live" });
    expect((fetchMock.mock.calls[1][0] as URL).searchParams.get("source")).toBe("archive");
  });

  it("passes selected make, model and range filters to the catalog API", async () => {
    const response = {
      items: [{ id: "4e75d2d8-0865-4c72-9bcc-5ddc11bca111", car: { mark: "BMW", model: "3 SERIES" }, characteristics: { year: "2022" }, onePrice: 1_250_000 }],
      pagination: { total: 283, totalPages: 3 }
    };
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(Response.json(response)));
    vi.stubGlobal("fetch", fetchMock);

    await fetchBanzaiPage(1, 100, { companyId: 2, modelId: 11519, yearFrom: 2020, yearTo: 2026, mileageTo: 80_000, sort: "price-asc" } as never);

    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.searchParams.get("source")).toBe("archive");
    expect(url.searchParams.get("company")).toBe("2");
    expect(url.searchParams.get("models[]")).toBe("11519");
    expect(url.searchParams.get("yearStart")).toBe("2020");
    expect(url.searchParams.get("yearEnd")).toBe("2026");
    expect(url.searchParams.get("mileageEnd")).toBe("80000");
    expect(url.searchParams.get("sortPrice")).toBe("asc");
    expect(url.searchParams.has("priceStart")).toBe(false);

    for (const [sort, parameter, direction, source] of [
      ["price-desc", "sortPrice", "desc", "archive"],
      ["mileage", "sortMileage", "asc", "archive"],
      ["newest", "sortYear", "desc", "archive"],
    ] as const) {
      await fetchBanzaiPage(1, 100, { sort });
      const sortedUrl = fetchMock.mock.calls.at(-1)?.[0] as URL;
      expect(sortedUrl.searchParams.get(parameter)).toBe(direction);
      expect(sortedUrl.searchParams.get("source")).toBe(source);
      expect(sortedUrl.searchParams.has("priceStart")).toBe(false);
    }
  });

  it("returns an empty catalog for a valid zero-result filter", async () => {
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: string | URL) => String(input) === "https://banzai24.com/"
      ? Promise.resolve(new Response("ok", { status: 200, headers: { "set-cookie": "session=jp; Path=/" } }))
      : Promise.resolve(Response.json({ items: [], pagination: { total: 0, totalPages: 0 } }))));
    const fresh = await import("./banzai");

    await expect(fresh.fetchBanzaiPage(1, 100, { mileageTo: 0 })).resolves.toMatchObject({ cars: [], total: 0 });
  });

  it("shares one session bootstrap across concurrent catalog requests", async () => {
    vi.resetModules();
    let homeCalls = 0;
    const fetchMock = vi.fn().mockImplementation((input: string | URL) => {
      const url = String(input);
      if (url === "https://banzai24.com/") {
        homeCalls += 1;
        return Promise.resolve(new Response("ok", { status: 200, headers: { "set-cookie": "session=jp; Path=/" } }));
      }
      if (url.includes("/companies")) return Promise.resolve(Response.json({ data: [{ id: 2, name: "BMW", hasLots: true }] }));
      return Promise.resolve(Response.json({
        items: [{ id: "4e75d2d8-0865-4c72-9bcc-5ddc11bca111", car: { mark: "BMW", model: "3 SERIES" }, onePrice: 1_250_000 }],
        pagination: { total: 1, totalPages: 1 }
      }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const fresh = await import("./banzai");

    await Promise.all([fresh.fetchBanzaiMakes(), fresh.fetchBanzaiPage(1)]);

    expect(homeCalls).toBe(1);
  });

  it("loads protected Banzai24 images with its session and referer", async () => {
    vi.resetModules();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("ok", { status: 200, headers: { "set-cookie": "session=jp; Path=/" } }))
      .mockResolvedValueOnce(new Response("image", { status: 200, headers: { "content-type": "image/webp" } }));
    vi.stubGlobal("fetch", fetchMock);
    const fresh = await import("./banzai");
    const fetchImage = Reflect.get(fresh, "fetchBanzaiImage");
    expect(fetchImage).toBeTypeOf("function");
    if (typeof fetchImage !== "function") return;

    const response = await fetchImage("v2_token-1");

    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://banzai24.com/api/image-service/v2_token-1", expect.objectContaining({
      headers: expect.objectContaining({ Cookie: "session=jp", Referer: "https://banzai24.com/" })
    }));
  });
});
