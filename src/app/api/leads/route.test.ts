import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  hasDatabase: vi.fn(), inTransaction: vi.fn(), query: vi.fn(), consumeLeadRateLimit: vi.fn()
}));

vi.mock("@/config/site", () => ({
  operatorReady: true,
  retentionReady: true,
  site: { url: "https://asia-trade.test", policyVersion: "test", telegram: "https://t.me/asia_trade", whatsapp: "", email: "", phone: "" }
}));
vi.mock("@/server/db", () => ({ hasDatabase: mocks.hasDatabase, inTransaction: mocks.inTransaction, query: mocks.query }));
vi.mock("@/server/leads", () => ({ consumeLeadRateLimit: mocks.consumeLeadRateLimit }));

import { POST } from "./route";

const lead = { name: "Иван", phone: "+7 900 000-00-00", city: "Москва", wishes: "Kia", consent: true, website: "", pageUrl: "https://asia-trade.test/orders" };
const request = () => new NextRequest("https://asia-trade.test/api/leads", { method: "POST", body: JSON.stringify(lead), headers: { "content-type": "application/json" } });

describe("lead delivery", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.consumeLeadRateLimit.mockResolvedValue(true); mocks.query.mockResolvedValue({ rows: [] }); });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("returns an honest contact fallback when automatic delivery is not configured", async () => {
    mocks.hasDatabase.mockReturnValue(false);
    const response = await POST(request());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ saved: false, contactUrl: "https://t.me/asia_trade" });
  });

  it("turns a database failure into a controlled unsaved response", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "token"); vi.stubEnv("TELEGRAM_CHAT_ID", "chat");
    mocks.hasDatabase.mockReturnValue(true);
    mocks.inTransaction.mockRejectedValue(new Error("database unavailable"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ saved: false });
  });

  it("reports success when the lead is saved but Telegram is unavailable", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "token"); vi.stubEnv("TELEGRAM_CHAT_ID", "chat");
    mocks.hasDatabase.mockReturnValue(true);
    mocks.inTransaction.mockResolvedValue("lead-1");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));
    const response = await POST(request());
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({ saved: true });
  });
});
