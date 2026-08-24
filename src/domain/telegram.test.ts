import { describe, expect, it } from "vitest";
import { inferTelegramImageContentType, parseAdminValue, parseCommissionCountry, parseReviewStep } from "./telegram";

describe("telegram admin input", () => {
  it("accepts spaced decimal values", () => {
    expect(parseAdminValue("100 000")).toBe(100_000);
    expect(parseAdminValue("0,059")).toBe(0.059);
  });

  it("rejects non-positive values", () => {
    expect(parseAdminValue("0")).toBeNull();
    expect(parseAdminValue("текст")).toBeNull();
  });

  it("recognizes separate country commission actions", () => {
    expect(parseCommissionCountry("set:commission")).toBe("kr");
    expect(parseCommissionCountry("set:commission:kr")).toBe("kr");
    expect(parseCommissionCountry("set:commission:jp")).toBe("jp");
    expect(parseCommissionCountry("set:commission:cn")).toBe("cn");
    expect(parseCommissionCountry("set:JPY")).toBeNull();
  });
});

describe("telegram review input", () => {
  it("collects title, text and Telegram photo in order", () => {
    expect(parseReviewStep("review:title", "Toyota Camry", undefined, {})).toEqual({ nextAction: "review:text", draft: { title: "Toyota Camry" } });
    expect(parseReviewStep("review:text", "Машина пришла в идеальном состоянии", undefined, { title: "Toyota Camry" })).toEqual({ nextAction: "review:image", draft: { title: "Toyota Camry", text: "Машина пришла в идеальном состоянии" } });
    expect(parseReviewStep("review:image", undefined, "photo-1", { title: "Toyota Camry", text: "Отзыв" })).toEqual({ complete: { title: "Toyota Camry", text: "Отзыв", photoFileId: "photo-1" } });
  });

  it("recognizes Telegram photos when the file endpoint uses a generic content type", () => {
    expect(inferTelegramImageContentType("application/octet-stream", "photos/review_1.jpg")).toBe("image/jpeg");
    expect(inferTelegramImageContentType("image/webp", "photos/review_1.bin")).toBe("image/webp");
    expect(inferTelegramImageContentType("text/html", "photos/review_1.jpg")).toBeNull();
    expect(inferTelegramImageContentType("text/html", "photos/review_1.bin")).toBeNull();
  });
});
