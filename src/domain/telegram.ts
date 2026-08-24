export function parseAdminValue(text: string) {
  const value = Number(text.replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function parseCommissionCountry(action: string) {
  if (action === "set:commission") return "kr" as const;
  const country = action.match(/^set:commission:(kr|jp|cn)$/)?.[1];
  return country ? country as "kr" | "jp" | "cn" : null;
}

export function inferTelegramImageContentType(contentType: string, filePath: string) {
  if (contentType.startsWith("image/")) return contentType;
  if (contentType && contentType !== "application/octet-stream") return null;
  const extension = filePath.toLowerCase().match(/\.(jpe?g|png|webp|gif)$/)?.[1];
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  return extension ? `image/${extension}` : null;
}

export type ReviewDraft = { title?: string; text?: string };

export function parseReviewStep(action: string, text: string | undefined, photoFileId: string | undefined, draft: ReviewDraft) {
  const clean = text?.trim();
  if (action === "review:title" && clean) return { nextAction: "review:text" as const, draft: { title: clean } };
  if (action === "review:text" && clean && draft.title) return { nextAction: "review:image" as const, draft: { ...draft, text: clean } };
  if (action === "review:image" && photoFileId && draft.title && draft.text) return { complete: { title: draft.title, text: draft.text, photoFileId } };
  return { error: action === "review:image" ? "Отправьте фотографию автомобиля." : "Отправьте текст одним сообщением." };
}
