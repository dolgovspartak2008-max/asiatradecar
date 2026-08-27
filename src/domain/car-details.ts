import { normalizeCostBreakdown } from "./pricing";

export type CostBreakdownLine = { label: string; value: string };

const specLabels: Record<string, Record<string, string>> = {
  transmission: { AT: "Автоматическая (AT)", MT: "Механическая (MT)", CVT: "Вариатор (CVT)", DCT: "Роботизированная (DCT)" },
  drive: { "2WD": "Монопривод (2WD)", FWD: "Передний привод (FWD)", RWD: "Задний привод (RWD)", "4WD": "Полный привод (4WD)", AWD: "Полный привод (AWD)" },
  body: { SUV: "Кроссовер / внедорожник (SUV)" }
};

export function formatVehicleSpec(kind: "transmission" | "drive" | "body", value: string | null) {
  if (!value) return null;
  return specLabels[kind][value.trim().toUpperCase()] || value;
}

export function parseCostBreakdown(details: Record<string, unknown>): CostBreakdownLine[] {
  if (!Array.isArray(details.costBreakdown)) return [];
  return details.costBreakdown.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const line = item as { label?: unknown; value?: unknown };
    const label = typeof line.label === "string" ? line.label.trim() : "";
    const value = typeof line.value === "string" ? line.value.trim() : "";
    return label && value ? [{ label, value }] : [];
  });
}

export function readCostBreakdown(details: Record<string, unknown>, commissionRub?: number, brokerRub?: number): CostBreakdownLine[] {
  return normalizeCostBreakdown(parseCostBreakdown(details), commissionRub, brokerRub);
}

export function reconcileCostBreakdown(lines: CostBreakdownLine[], totalRub: number | null): CostBreakdownLine[] {
  if (!totalRub || totalRub <= 0) return lines;
  const rowsTotal = lines.reduce((sum, line) => {
    const rubles = line.value.match(/([\d\s\u00a0]+)\s*₽/g)?.at(-1);
    return sum + (rubles ? Number(rubles.replace(/[^\d]/g, "")) : 0);
  }, 0);
  if (!rowsTotal) return lines;
  const difference = Math.round(totalRub) - rowsTotal;
  if (!difference) return lines;
  return [...lines, { label: "Корректировка расчёта источника", value: `${difference.toLocaleString("ru-RU").replace(/\u00a0/g, " ")} ₽` }];
}

export function readInsuranceHistory(details: Record<string, unknown>) {
  for (const key of ["insuranceOwn", "accident"] as const) {
    const value = details[key];
    if (typeof value === "string" && value.trim()) {
      const clean = value.trim();
      const match = clean.match(/^(\d+)\s*\/\s*(.+)$/);
      if (match) {
        const count = Number(match[1]);
        const cases = count === 1 ? "страховой случай" : count > 1 && count < 5 ? "страховых случая" : "страховых случаев";
        const rubles = match[2].includes("₩") ? match[2].match(/([\d\s\u00a0]+\s*₽)/)?.[1] : null;
        return `${count} ${cases}\nсумма ${(rubles || match[2]).trim()}`;
      }
      return clean;
    }
  }
  return "Нет данных в источнике";
}
