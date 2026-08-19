import type { CatalogFilters } from "@/domain/catalog";
import { buildCatalogQuery } from "@/domain/catalog";
import { hasDatabase, query } from "@/server/db";

export type Car = {
  id: string;
  slug: string;
  make: string;
  model: string;
  trim: string | null;
  year: number;
  mileageKm: number;
  engineCc: number | null;
  powerHp: number | null;
  fuel: string | null;
  transmission: string | null;
  drive: string | null;
  bodyType: string | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  vin: string | null;
  priceKrw: number;
  priceRub: number | null;
  photos: string[];
  details: Record<string, unknown>;
};

type CarRow = {
  id: string; slug: string; make: string; model: string; trim: string | null; year: number;
  mileage_km: number; engine_cc: number | null; power_hp: number | null; fuel: string | null;
  transmission: string | null; drive: string | null; body_type: string | null;
  exterior_color: string | null; interior_color: string | null; vin: string | null;
  price_krw: string | number; price_rub: string | number | null; photos: unknown; details: unknown;
};

const toCar = (row: CarRow): Car => ({
  id: row.id, slug: row.slug, make: row.make, model: row.model, trim: row.trim, year: row.year,
  mileageKm: row.mileage_km, engineCc: row.engine_cc, powerHp: row.power_hp, fuel: row.fuel,
  transmission: row.transmission, drive: row.drive, bodyType: row.body_type,
  exteriorColor: row.exterior_color, interiorColor: row.interior_color, vin: row.vin,
  priceKrw: Number(row.price_krw), priceRub: row.price_rub === null ? null : Number(row.price_rub),
  photos: Array.isArray(row.photos) ? row.photos.filter((item): item is string => typeof item === "string") : [],
  details: row.details && typeof row.details === "object" ? row.details as Record<string, unknown> : {}
});

export async function getCatalog(filters: CatalogFilters) {
  if (!hasDatabase()) return { cars: [] as Car[], total: 0, makes: [] as string[] };
  const built = buildCatalogQuery(filters);
  const countValues = built.values.slice(0, -2);
  const where = built.text.match(/FROM cars WHERE (.+) ORDER BY/s)?.[1] ?? "status = 'active'";
  const [carsResult, countResult, makesResult] = await Promise.all([
    query<CarRow>(built.text, built.values),
    query<{ count: string }>(`SELECT count(*)::text AS count FROM cars WHERE ${where}`, countValues),
    query<{ make: string }>("SELECT DISTINCT make FROM cars WHERE status = 'active' AND country = $1 ORDER BY make", [filters.country])
  ]);
  return { cars: carsResult.rows.map(toCar), total: Number(countResult.rows[0]?.count ?? 0), makes: makesResult.rows.map((row) => row.make) };
}

export async function getCarBySlug(slug: string) {
  if (!hasDatabase()) return null;
  const result = await query<CarRow>("SELECT * FROM cars WHERE slug = $1 AND status = 'active' LIMIT 1", [slug]);
  return result.rows[0] ? toCar(result.rows[0]) : null;
}

export async function getLatestCars(limit = 4) {
  if (!hasDatabase()) return [] as Car[];
  const result = await query<CarRow>("SELECT * FROM cars WHERE status = 'active' ORDER BY year DESC, updated_at DESC LIMIT $1", [limit]);
  return result.rows.map(toCar);
}

export async function searchCars(term: string, limit = 20) {
  if (!hasDatabase() || term.trim().length < 2) return [] as Array<{ slug: string; label: string }>;
  const result = await query<{ slug: string; make: string; model: string; trim: string | null; year: number }>(
    `SELECT slug, make, model, trim, year FROM cars
     WHERE status = 'active' AND country = 'kr' AND search_vector @@ plainto_tsquery('simple', $1)
     ORDER BY year DESC, updated_at DESC LIMIT $2`, [term.trim(), Math.min(20, Math.max(1, limit))]
  );
  return result.rows.map((row) => ({ slug: row.slug, label: `${row.make} ${row.model}${row.trim ? ` ${row.trim}` : ""} · ${row.year}` }));
}
