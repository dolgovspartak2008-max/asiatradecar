type CatalogPricedCar = { slug: string; priceRub: number | null };
type PriceEntry = { priceRub: number; expiresAt: number };

const TTL_MS = 10 * 60 * 1_000;
const shared = globalThis as typeof globalThis & { __asiaTradeCatalogPrices?: Map<string, PriceEntry> };
const prices = shared.__asiaTradeCatalogPrices ??= new Map<string, PriceEntry>();

export function rememberCatalogPrices(cars: CatalogPricedCar[], now = Date.now()) {
  for (const [slug, entry] of prices) if (entry.expiresAt <= now) prices.delete(slug);
  for (const car of cars) {
    if (car.priceRub && car.priceRub > 0) prices.set(car.slug, { priceRub: Math.round(car.priceRub), expiresAt: now + TTL_MS });
  }
}

export function catalogPriceFor(slug: string, fallback: number | null, now = Date.now()) {
  const entry = prices.get(slug);
  if (!entry || entry.expiresAt <= now) {
    if (entry) prices.delete(slug);
    return fallback;
  }
  return entry.priceRub;
}
