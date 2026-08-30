import type { Car } from "@/server/catalog";

export type FavoriteCar = Omit<Pick<Car, "id" | "slug" | "country" | "make" | "model" | "trim" | "year" | "mileageKm" | "engineCc" | "powerHp" | "drive" | "priceRub" | "photos">, "photos"> & { fuel?: string | null; photos: readonly string[]; details?: Record<string, unknown> };
export type FavoriteEntry = string | FavoriteCar;
type FavoriteCandidate = Omit<FavoriteCar, "photos"> & { photos: readonly string[] };

const nullable = (value: unknown, type: "string" | "number") => value === null || typeof value === type;
const validCar = (value: unknown): value is FavoriteCar => {
  if (!value || typeof value !== "object") return false;
  const car = value as FavoriteCar;
  return [car.id, car.slug, car.country, car.make, car.model].every((item) => typeof item === "string")
    && nullable(car.trim, "string") && typeof car.year === "number" && typeof car.mileageKm === "number"
    && nullable(car.engineCc, "number") && nullable(car.powerHp, "number") && (car.fuel === undefined || nullable(car.fuel, "string")) && nullable(car.drive, "string")
    && nullable(car.priceRub, "number") && Array.isArray(car.photos) && car.photos.every((photo) => typeof photo === "string")
    && (car.details === undefined || Boolean(car.details) && typeof car.details === "object" && !Array.isArray(car.details));
};
const same = (entry: FavoriteEntry, car: Pick<FavoriteCar, "id" | "country">) => typeof entry === "string" ? entry === car.id : entry.id === car.id && entry.country === car.country;

export function parseFavoriteEntries(raw: string): FavoriteEntry[] {
  try {
    const values = JSON.parse(raw) as unknown;
    return Array.isArray(values) ? values.filter((value): value is FavoriteEntry => typeof value === "string" || validCar(value)) : [];
  } catch { return []; }
}

export function isFavorite(entries: FavoriteEntry[], car: Pick<FavoriteCar, "id" | "country">) {
  return entries.some((entry) => same(entry, car));
}

export function toggleFavorite(entries: FavoriteEntry[], car: FavoriteCandidate): FavoriteEntry[] {
  if (isFavorite(entries, car)) return entries.filter((entry) => !same(entry, car));
  return [...entries, { ...car, photos: [...car.photos] }];
}

export function resolveFavoriteCars(entries: FavoriteEntry[], freshCars: FavoriteCar[]): FavoriteCar[] {
  const fresh = new Map(freshCars.map((car) => [`${car.country}:${car.id}`, car]));
  return entries.flatMap((entry) => {
    if (typeof entry === "string") return freshCars.find((car) => car.id === entry) || [];
    return fresh.get(`${entry.country}:${entry.id}`) || entry;
  });
}
