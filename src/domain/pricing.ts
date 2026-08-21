type CostBreakdownLine = { label: string; value: string };

export const DEFAULT_COMMISSION_RUB = 100_000;

const formatRub = (value: number) => `${Math.round(value).toLocaleString("ru-RU").replace(/\u00a0/g, " ")} ₽`;

export function normalizeCostBreakdown(lines: CostBreakdownLine[], commissionRub = DEFAULT_COMMISSION_RUB) {
  const result: CostBreakdownLine[] = [];
  let commissionAdded = false;
  for (const line of lines) {
    if (/фиксированн.*сбор|стоянк.*логист/i.test(line.label)) continue;
    if (/комисси/i.test(line.label)) {
      if (!commissionAdded) result.push({ label: "Комиссия компании", value: formatRub(commissionRub) });
      commissionAdded = true;
      continue;
    }
    result.push(line);
  }
  if (!commissionAdded) result.unshift({ label: "Комиссия компании", value: formatRub(commissionRub) });
  return result;
}

export function applyCatalogPricing(sourcePrice: number, rubPerUnit: number, commissionRub = DEFAULT_COMMISSION_RUB) {
  return Math.round(sourcePrice * rubPerUnit + commissionRub);
}
