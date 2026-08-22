import { describe, expect, it } from "vitest";
import { telegramWebhookStatus } from "@/server/telegram-bot";

describe("telegramWebhookStatus", () => {
  it("reports only missing webhook variables", () => {
    expect(telegramWebhookStatus({ TELEGRAM_BOT_TOKEN: "", TELEGRAM_WEBHOOK_SECRET: "secret" }, "http://localhost:3000")).toEqual({
      configured: false,
      missing: ["TELEGRAM_BOT_TOKEN", "SITE_URL"],
    });
  });

  it("accepts a complete production configuration", () => {
    expect(telegramWebhookStatus({ TELEGRAM_BOT_TOKEN: "token", TELEGRAM_WEBHOOK_SECRET: "secret" }, "https://example.com")).toEqual({
      configured: true,
      missing: [],
    });
  });
});
