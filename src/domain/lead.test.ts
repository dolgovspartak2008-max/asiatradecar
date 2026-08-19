import { describe, expect, it } from "vitest";
import { buildTelegramMessage, validateLead } from "./lead";

describe("lead validation", () => {
  it("requires a separate personal-data consent", () => {
    const result = validateLead({ name: "Анна", phone: "+79991234567", city: "Тюмень", wishes: "Kia K5", consent: false, website: "" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid lead and excludes source links from Telegram", () => {
    const result = validateLead({ name: "Анна", phone: "+79991234567", city: "Тюмень", wishes: "Kia K5", consent: true, website: "" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const message = buildTelegramMessage(result.data, { carName: "Kia K5", pageUrl: "https://asia-trade-car.ru/auto/123", sourceUrl: "https://trust-encar.ru/auto/123" });
    expect(message).toContain("Kia K5");
    expect(message).toContain("asia-trade-car.ru");
    expect(message).not.toContain("trust-encar.ru");
  });
});
