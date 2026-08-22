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
});
