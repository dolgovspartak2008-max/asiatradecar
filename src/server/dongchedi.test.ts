import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDongchediUsedPage } from "./dongchedi";

describe("Dongchedi used catalog client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("requests a real page of used listings from the official endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: {
      total: 10_000,
      has_more: true,
      search_sh_sku_info_list: [{
        sku_id: 123,
        brand_name: "宝马",
        series_name: "宝马3系",
        car_name: "325Li M运动套装",
        car_year: 2022,
        sh_price: "\ue463\ue439.\ue411\ue40a",
        sub_title: "\ue463\ue439\ue463\ue463\ue525 | \ue463.\ue411\ue40a\ue40a\ue492\ue4a8",
        image: "https://example.test/bmw.webp"
      }]
    } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchDongchediUsedPage(3, 60);

    expect(result.cars[0]).toMatchObject({ id: "dongchedi-used-123", make: "BMW", model: "3 Series", sourcePrice: 205_000, mileageKm: 25_000 });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/motor/pc/sh/sh_sku_list"), expect.objectContaining({
      method: "POST",
      body: expect.any(URLSearchParams)
    }));
    expect(fetchMock.mock.calls[0][1].body.toString()).toContain("page=3");
    expect(fetchMock.mock.calls[0][1].body.toString()).toContain("limit=60");
  });
});
