export function parseAdminValue(text: string) {
  const value = Number(text.replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export type ReviewDraft = { title?: string; text?: string };

export function parseReviewStep(action: string, text: string | undefined, photoFileId: string | undefined, draft: ReviewDraft) {
  const clean = text?.trim();
  if (action === "review:title" && clean) return { nextAction: "review:text" as const, draft: { title: clean } };
  if (action === "review:text" && clean && draft.title) return { nextAction: "review:image" as const, draft: { ...draft, text: clean } };
  if (action === "review:image" && photoFileId && draft.title && draft.text) return { complete: { title: draft.title, text: draft.text, photoFileId } };
  return { error: action === "review:image" ? "Отправьте фотографию автомобиля." : "Отправьте текст одним сообщением." };
}
