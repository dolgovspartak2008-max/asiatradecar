export function parseAdminValue(text: string) {
  const value = Number(text.replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}
