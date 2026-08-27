export type CursorPage<T> = { items: T[]; nextCursor?: string | null };
type PageResult<T> = { page: CursorPage<T> } | { error: unknown };

type CatalogCard = {
  id: string;
  vin: string | null;
  priceRub: number | null;
  photos: string[];
  year: number;
  mileageKm: number;
  details?: Record<string, unknown>;
};

const normalizedVin = (vin: string | null) => vin?.replace(/[^a-z0-9*]/gi, "").toUpperCase() || "";
const hasPrice = (car: CatalogCard) => typeof car.priceRub === "number" && Number.isFinite(car.priceRub) && car.priceRub > 0;
const hasPhoto = (car: CatalogCard) => car.photos.some((photo) => photo.trim().length > 0);
const qualityRank = (car: CatalogCard) => (hasPrice(car) ? 0 : 2) + (hasPhoto(car) ? 0 : 1);
const freshness = (car: CatalogCard) => {
  const raw = car.details?.updatedAt ?? car.details?.tradeDate ?? car.details?.trade_date;
  const parsed = typeof raw === "string" || typeof raw === "number" ? Date.parse(String(raw)) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

const selectedOrder = (left: CatalogCard, right: CatalogCard, sort: "price-asc" | "price-desc" | "newest" | "mileage") =>
  sort === "price-asc" ? (left.priceRub || 0) - (right.priceRub || 0)
    : sort === "price-desc" ? (right.priceRub || 0) - (left.priceRub || 0)
      : sort === "mileage" ? left.mileageKm - right.mileageKm
        : right.year - left.year;

export function mergeCatalogCars<TCurrent extends CatalogCard, TNext extends CatalogCard>(current: TCurrent[], next: TNext[], sort: "price-asc" | "price-desc" | "newest" | "mileage") {
  const merged: Array<TCurrent | TNext> = [];
  for (const car of [...current, ...next]) {
    const vin = normalizedVin(car.vin);
    const duplicate = merged.findIndex((item) => item.id === car.id || (vin && normalizedVin(item.vin) === vin));
    if (duplicate < 0) merged.push(car);
    else {
      const previous = merged[duplicate];
      const quality = qualityRank(car) - qualityRank(previous);
      const newer = freshness(car) - freshness(previous);
      if (quality < 0 || (quality === 0 && (newer > 0 || (newer === 0 && (selectedOrder(car, previous, sort) < 0
        || (selectedOrder(car, previous, sort) === 0 && car.id.localeCompare(previous.id) > 0)))))) merged[duplicate] = car;
    }
  }
  return merged.map((car, index) => ({ car, index })).sort((left, right) => {
    const quality = qualityRank(left.car) - qualityRank(right.car);
    if (quality) return quality;
    const selected = selectedOrder(left.car, right.car, sort);
    return selected || left.index - right.index;
  }).map(({ car }) => car);
}

export async function walkCursorPages<T>(
  fetchPage: (cursor?: string) => Promise<CursorPage<T>>,
  consume: (items: T[], page: number) => Promise<void>
) {
  const seen = new Set<string>();
  let pages = 0;
  let received = 0;
  const request = (cursor?: string): Promise<PageResult<T>> => fetchPage(cursor).then(
    (page) => ({ page }),
    (error: unknown) => ({ error })
  );
  let pending: Promise<PageResult<T>> | undefined = request();

  while (pending) {
    const result: PageResult<T> = await pending;
    if ("error" in result) throw result.error;
    const page: CursorPage<T> = result.page;
    if (!Array.isArray(page.items)) throw new Error("Фид вернул страницу без массива items");
    pages += 1;
    const next: string | undefined = page.nextCursor || undefined;
    if (next && seen.has(next)) throw new Error("Фид вернул повторяющийся cursor");
    if (next) seen.add(next);
    pending = next ? request(next) : undefined;
    await consume(page.items, pages);
    received += page.items.length;
  }
  return { pages, received };
}
