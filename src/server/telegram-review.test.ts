import { beforeEach, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { query } from "@/server/db";
import { handleTelegramUpdate } from "@/server/telegram-bot";
import { setCatalogRate, setCommissionRub } from "@/server/pricing";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/db", () => ({ query: vi.fn() }));
vi.mock("@/server/pricing", () => ({
  getPricingSettings: vi.fn().mockResolvedValue({ commissions: { kr: 100_000, jp: 100_000, cn: 100_000 }, rates: { KRW: 0.059, JPY: 0.62, CNY: 11.5 } }),
  setCatalogRate: vi.fn(),
  setCommissionRub: vi.fn()
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TELEGRAM_OWNER_ID", "1");
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "token");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
});

it("revalidates the home page immediately after publishing a review", async () => {
  vi.mocked(query).mockImplementation(async (sql) => String(sql).startsWith("SELECT action")
    ? { rows: [{ action: "review:image", state: { title: "Renault Arkana", text: "Отзыв" } }] } as never
    : { rows: [] } as never);

  await handleTelegramUpdate({
    message: { chat: { id: 10 }, from: { id: 1 }, photo: [{ file_id: "photo-1", width: 1280, height: 960 }] }
  });

  expect(vi.mocked(query).mock.calls.some(([sql]) => String(sql).startsWith("INSERT INTO reviews"))).toBe(true);
  expect(revalidatePath).toHaveBeenCalledWith("/");
});

it.each([
  ["set:commission:kr", "100000", "kr", 100_000],
  ["set:commission:jp", "50000", "jp", 50_000],
  ["set:commission:cn", "100000", "cn", 100_000],
] as const)("updates %s through the Telegram admin flow", async (action, text, country, value) => {
  vi.mocked(query).mockImplementation(async (sql) => String(sql).startsWith("SELECT action")
    ? { rows: [{ action, state: {} }] } as never
    : { rows: [] } as never);

  await handleTelegramUpdate({ message: { chat: { id: 10 }, from: { id: 1 }, text } });

  expect(setCommissionRub).toHaveBeenCalledWith(country, value, 1);
});

it.each([
  ["set:KRW", "0,061", "KRW", 0.061],
  ["set:JPY", "62", "JPY", 62],
  ["set:CNY", "12,1", "CNY", 12.1],
] as const)("updates %s through the Telegram admin flow", async (action, text, currency, value) => {
  vi.mocked(query).mockImplementation(async (sql) => String(sql).startsWith("SELECT action")
    ? { rows: [{ action, state: {} }] } as never
    : { rows: [] } as never);

  await handleTelegramUpdate({ message: { chat: { id: 10 }, from: { id: 1 }, text } });

  expect(setCatalogRate).toHaveBeenCalledWith(currency, value);
});
