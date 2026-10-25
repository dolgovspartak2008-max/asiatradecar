type CatalogPricedCar = { slug: string; priceRub: number | null };
type PriceEntry = { priceRub: number; expiresAt: number };
type CarEntry = { car: CatalogPricedCar; expiresAt: number };

const TTL_MS = 10 * 60 * 1_000;
const CAR_TTL_MS = 6 * 60 * 60 * 1_000;
const MAX_CARS = 5_000;
const shared = globalThis as typeof globalThis & {
  __asiaTradeCatalogPrices?: Map<string, PriceEntry>;
  __asiaTradeCatalogCars?: Map<string, CarEntry>;
};
const prices = shared.__asiaTradeCatalogPrices ??= new Map<string, PriceEntry>();
const cars = shared.__asiaTradeCatalogCars ??= new Map<string, CarEntry>();

export function rememberCatalogPrices(items: CatalogPricedCar[], now = Date.now()) {
  for (const [slug, entry] of prices) if (entry.expiresAt <= now) prices.delete(slug);
  for (const car of items) {
    if (car.priceRub && car.priceRub > 0) prices.set(car.slug, { priceRub: Math.round(car.priceRub), expiresAt: now + TTL_MS });
    cars.delete(car.slug);
    cars.set(car.slug, { car, expiresAt: now + CAR_TTL_MS });
  }
  while (cars.size > MAX_CARS) cars.delete(cars.keys().next().value as string);
}

export function catalogPriceFor(slug: string, fallback: number | null, now = Date.now()) {
  const entry = prices.get(slug);
  if (!entry || entry.expiresAt <= now) {
    if (entry) prices.delete(slug);
    return fallback;
  }
  return entry.priceRub;
}

export function catalogCarFor<T extends CatalogPricedCar>(slug: string, now = Date.now()) {
  const entry = cars.get(slug);
  if (!entry || entry.expiresAt <= now) {
    if (entry) cars.delete(slug);
    return null;
  }
  return entry.car as T;
}
