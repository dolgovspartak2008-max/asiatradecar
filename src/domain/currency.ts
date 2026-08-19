export function parseCbrCurrencyRate(xml: string, code: string) {
  const block = xml.match(new RegExp(`<Valute[\\s\\S]*?<CharCode>${code}<\\/CharCode>[\\s\\S]*?<\\/Valute>`, "i"))?.[0];
  const nominal = block?.match(/<Nominal>([^<]+)<\/Nominal>/i)?.[1];
  const value = block?.match(/<Value>([^<]+)<\/Value>/i)?.[1];

  if (!nominal || !value) throw new Error(`${code} rate not found`);
  const rate = Number(value.replace(",", ".")) / Number(nominal);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error(`Invalid ${code} rate`);
  const rawDate = xml.match(/<ValCurs[^>]*Date="([^"]+)"/i)?.[1];
  const [day, month, year] = rawDate?.split(".") ?? [];
  const date = day && month && year ? `${year}-${month}-${day}` : new Date().toISOString().slice(0, 10);
  return { code, rubPerUnit: rate, date };
}

export function parseCbrKrwRate(xml: string): number {
  return parseCbrCurrencyRate(xml, "KRW").rubPerUnit;
}

export function formatRub(value: number): string {
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

export function formatKrw(value: number): string {
  return `${Math.round(value).toLocaleString("ru-RU")} ₩`;
}
