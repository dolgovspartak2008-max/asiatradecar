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
  });

  it("passes selected make, model and range filters to the catalog API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      items: [{ id: "4e75d2d8-0865-4c72-9bcc-5ddc11bca111", car: { mark: "BMW", model: "3 SERIES" }, characteristics: { year: "2022" }, onePrice: 1_250_000 }],
      pagination: { total: 283, totalPages: 3 }
    }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchBanzaiPage(1, 100, { companyId: 2, modelId: 11519, yearFrom: 2020, yearTo: 2026, mileageTo: 80_000 });

    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.searchParams.get("company")).toBe("2");
    expect(url.searchParams.get("models[]")).toBe("11519");
    expect(url.searchParams.get("yearStart")).toBe("2020");
    expect(url.searchParams.get("yearEnd")).toBe("2026");
    expect(url.searchParams.get("mileageEnd")).toBe("80000");
  });
});
