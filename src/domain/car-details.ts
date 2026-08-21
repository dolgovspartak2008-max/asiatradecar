import { normalizeCostBreakdown } from "./pricing";

export type CostBreakdownLine = { label: string; value: string };

export function readCostBreakdown(details: Record<string, unknown>, commissionRub?: number): CostBreakdownLine[] {
  if (!Array.isArray(details.costBreakdown)) return [];
  const lines = details.costBreakdown.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const line = item as { label?: unknown; value?: unknown };
    const label = typeof line.label === "string" ? line.label.trim() : "";
    const value = typeof line.value === "string" ? line.value.trim() : "";
    return label && value ? [{ label, value }] : [];
  });
  return normalizeCostBreakdown(lines, commissionRub);
}

export function readInsuranceHistory(details: Record<string, unknown>) {
  for (const key of ["insuranceOwn", "accident"] as const) {
    const value = details[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "Нет данных в источнике";
}
