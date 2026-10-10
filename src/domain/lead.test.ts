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

  it("rejects phone values without enough digits", () => {
    expect(validateLead({ name: "Анна", phone: "(--------)", city: "Тюмень", consent: true, website: "" }).success).toBe(false);
    expect(validateLead({ name: "Анна", phone: "+7 (999) 12-3", city: "Тюмень", consent: true, website: "" }).success).toBe(false);
    expect(validateLead({ name: "Анна", phone: "8 (917) 041-88-55", city: "Тюмень", consent: true, website: "" }).success).toBe(true);
  });

  it("accepts a selected-car lead without the optional wishes field", () => {
    const result = validateLead({ name: "Анна", phone: "+79991234567", city: "Тюмень", consent: true, website: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.wishes).toBe("");
  });
});
