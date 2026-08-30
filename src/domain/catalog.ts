export type CatalogSort = "price-asc" | "price-desc" | "newest" | "mileage";

export type CatalogFilters = {
  q?: string;
  country: string;
  make?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  priceFrom?: number;
  priceTo?: number;
  mileageTo?: number;
  bodyType?: string;
  fuel?: string;
  drive?: string;
  engineFrom?: number;
  engineTo?: number;
  powerFrom?: number;
  powerTo?: number;
  sort: CatalogSort;
  limit: number;
  offset: number;
};

type SearchParams = Record<string, string | string[] | undefined>;

const scalar = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const positiveNumber = (value: string | string[] | undefined) => {
  const raw = scalar(value);
  if (!raw?.trim()) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

export function parseCatalogParams(params: SearchParams): CatalogFilters {
  const rawSort = scalar(params.sort);
  const sort: CatalogSort = ["price-asc", "price-desc", "newest", "mileage"].includes(rawSort ?? "")
    ? rawSort as CatalogSort
    : "newest";
  const limit = Math.floor(Math.min(24, Math.max(1, positiveNumber(params.limit) ?? 24)));
  const page = Math.floor(Math.max(1, positiveNumber(params.page) ?? 1));

  return {
    q: scalar(params.q)?.trim() || undefined,
    country: scalar(params.country) || "kr",
    make: scalar(params.make) || undefined,
    model: scalar(params.model) || undefined,
    yearFrom: positiveNumber(params.yearFrom),
    yearTo: positiveNumber(params.yearTo),
    priceFrom: positiveNumber(params.priceFrom),
    priceTo: positiveNumber(params.priceTo),
    mileageTo: positiveNumber(params.mileageTo),
    bodyType: scalar(params.bodyType) || undefined,
    fuel: scalar(params.fuel) || undefined,
    drive: scalar(params.drive) || undefined,
    engineFrom: positiveNumber(params.engineFrom),
    engineTo: positiveNumber(params.engineTo),
    powerFrom: positiveNumber(params.powerFrom),
    powerTo: positiveNumber(params.powerTo),
    sort,
    limit,
    offset: (page - 1) * limit
  };
}

export const catalogStatusClause = (country: string) => country === "jp"
  ? "status = 'active' AND details->>'catalogSection' IN ('auctions', 'onePrice')"
  : "status = 'active'";

export function buildCatalogQuery(filters: CatalogFilters) {
  const where = [catalogStatusClause(filters.country), "country = $1"];
  const values: unknown[] = [filters.country];
  const add = (clause: string, value: unknown) => { values.push(value); where.push(clause.replace("?", `$${values.length}`)); };

  if (filters.q) add("search_vector @@ plainto_tsquery('simple', ?)", filters.q);
  if (filters.make) add("make = ?", filters.make);
  if (filters.model) add("model = ?", filters.model);
  if (filters.yearFrom !== undefined) add("year >= ?", filters.yearFrom);
  if (filters.yearTo !== undefined) add("year <= ?", filters.yearTo);
  if (filters.priceFrom !== undefined) add("price_rub >= ?", filters.priceFrom);
  if (filters.priceTo !== undefined) add("price_rub <= ?", filters.priceTo);
  if (filters.mileageTo !== undefined) add("mileage_km <= ?", filters.mileageTo);
  if (filters.bodyType) add("body_type = ?", filters.bodyType);
  if (filters.fuel) add("fuel = ?", filters.fuel);
  if (filters.drive) add("drive = ?", filters.drive);
  if (filters.engineFrom !== undefined) add("engine_cc >= ?", filters.engineFrom);
  if (filters.engineTo !== undefined) add("engine_cc <= ?", filters.engineTo);
  if (filters.powerFrom !== undefined) add("power_hp >= ?", filters.powerFrom);
  if (filters.powerTo !== undefined) add("power_hp <= ?", filters.powerTo);

  const order = {
    "price-asc": "price_rub ASC NULLS LAST, id DESC",
    "price-desc": "price_rub DESC NULLS LAST, id DESC",
    newest: "year DESC, id DESC",
    mileage: "mileage_km ASC, id DESC"
  }[filters.sort];
  const whereSql = where.join(" AND ");
  const dedupeKey = "COALESCE(NULLIF(regexp_replace(upper(vin), '[^A-Z0-9*]', '', 'g'), ''), id::text)";
  const qualityOrder = "(price_rub IS NULL OR price_rub <= 0) ASC, (jsonb_array_length(photos) = 0) ASC";
  values.push(filters.limit, filters.offset);

  return {
    text: `SELECT * FROM cars WHERE id IN (SELECT id FROM (SELECT DISTINCT ON (${dedupeKey}) id, ${dedupeKey} AS dedupe_key, (price_rub IS NULL OR price_rub <= 0) AS missing_price, (jsonb_array_length(photos) = 0) AS missing_photo, updated_at FROM cars WHERE ${whereSql} ORDER BY ${dedupeKey}, missing_price ASC, missing_photo ASC, updated_at DESC, id DESC) AS deduplicated) ORDER BY ${qualityOrder}, ${order} LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
    where: whereSql,
    dedupeKey
  };
}
