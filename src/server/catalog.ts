import type { CatalogFilters } from "../domain/catalog";
import { buildCatalogQuery, parseCatalogParams } from "../domain/catalog";
import { buildTrustEncarSearchBody, normalizeTrustEncarRecord, parseTrustEncarBootstrap, parseTrustEncarCatalogPage, parseTrustEncarModelsFacet, parseTrustEncarVehiclePage, type TrustEncarCatalogCar } from "../domain/sync";
import { hasDatabase, query } from "./db";

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

const fromFeedCar = (car: TrustEncarCatalogCar): Car => ({
  id: car.id, slug: car.slug, make: car.make, model: car.model, trim: car.trim, year: car.year,
  mileageKm: car.mileageKm, engineCc: car.engineCc, powerHp: car.powerHp, fuel: car.fuel,
  transmission: car.transmission, drive: car.drive, bodyType: car.bodyType,
  exteriorColor: car.exteriorColor, interiorColor: car.interiorColor, vin: car.vin,
  priceKrw: car.priceKrw, priceRub: car.priceRub, photos: car.photos, details: car.details
});

const isDefaultBrowse = (filters: CatalogFilters) => filters.country === "kr" && filters.limit === 24 && filters.sort === "newest"
  && !filters.q && !filters.make && !filters.model && filters.yearFrom === undefined && filters.yearTo === undefined
  && filters.priceFrom === undefined && filters.priceTo === undefined && filters.mileageTo === undefined
  && !filters.bodyType && !filters.fuel && !filters.drive && filters.engineFrom === undefined
  && filters.engineTo === undefined && filters.powerFrom === undefined && filters.powerTo === undefined;

async function getBrowseCatalog(filters: CatalogFilters) {
  const page = Math.floor(filters.offset / filters.limit) + 1;
  const response = await fetch(`https://trust-encar.ru/catalog/?page=${page}`, {
    next: { revalidate: 300, tags: [`trust-encar-page-${page}`] },
    signal: AbortSignal.timeout(6_000)
  });
  if (!response.ok) throw new Error(`Trust Encar вернул ${response.status}`);
  const parsed = parseTrustEncarCatalogPage(await response.text());
  if (!parsed.cars.length && page <= Math.ceil(parsed.total / filters.limit)) throw new Error("Trust Encar вернул пустую страницу каталога");
  return { cars: parsed.cars.map(fromFeedCar), total: parsed.total, makes: parsed.makes, models: [] as string[] };
}

async function getLiveCatalog(filters: CatalogFilters) {
  const pageResponse = await fetch("https://trust-encar.ru/catalog/", {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8_000)
  });
  if (!pageResponse.ok) throw new Error(`Trust Encar вернул ${pageResponse.status}`);
  const bootstrap = parseTrustEncarBootstrap(await pageResponse.text());
  const make = bootstrap.makes.find((item) => item.name.toLowerCase() === filters.make?.toLowerCase());
  let modelId: string | undefined;
  if (filters.model && filters.make) {
    const lookupBody = new URLSearchParams({ action: "te_catalog_lookup_ids_db", nonce: bootstrap.nonce, marka: filters.make, model: filters.model });
    const lookupResponse = await fetch(bootstrap.ajaxUrl, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      body: lookupBody,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000)
    });
    if (!lookupResponse.ok) throw new Error("Trust Encar не распознал выбранную модель");
    const lookup = await lookupResponse.json() as { model_id?: unknown };
    modelId = String(lookup.model_id || "") || undefined;
    if (!modelId) throw new Error("Trust Encar не вернул идентификатор выбранной модели");
  }
  const request = (action: "search_db" | "ajax_catalog_count_db") => fetch(bootstrap.ajaxUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    },
    body: buildTrustEncarSearchBody(action, filters, bootstrap, modelId),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000)
  });
  const modelsRequest = make ? fetch(bootstrap.ajaxUrl, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: new URLSearchParams({ action: "ajax_facets_state_db", nonce: bootstrap.nonce, marka_id: make.id }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000)
  }) : null;
  const [carsResponse, countResponse, modelsResponse] = await Promise.all([request("search_db"), request("ajax_catalog_count_db"), modelsRequest]);
  if (!carsResponse.ok || !countResponse.ok) throw new Error("Trust Encar временно не отдаёт каталог");
  const [records, count] = await Promise.all([carsResponse.json(), countResponse.json()]) as [unknown, { status?: unknown; total?: unknown }];
  if (!Array.isArray(records)) throw new Error("Trust Encar вернул некорректный каталог");

  const cars = records.flatMap((record): Car[] => {
    if (!record || typeof record !== "object") return [];
    const raw = record as Record<string, unknown>;
    const normalized = normalizeTrustEncarRecord(raw);
    return [{
      id: normalized.id,
      slug: normalized.slug,
      make: normalized.make,
      model: normalized.model,
      trim: normalized.trim,
      year: normalized.year,
      mileageKm: normalized.mileageKm,
      engineCc: normalized.engineCc,
      powerHp: normalized.powerHp,
      fuel: normalized.fuel,
      transmission: normalized.transmission,
      drive: normalized.drive,
      bodyType: normalized.bodyType,
      exteriorColor: normalized.exteriorColor,
      interiorColor: normalized.interiorColor,
      vin: normalized.vin,
      priceKrw: normalized.priceKrw,
      priceRub: Number(raw.FINISH_RUB) || null,
      photos: normalized.photos,
      details: normalized.details
    }];
  });
  const total = count.status === "success" && Number.isFinite(Number(count.total)) ? Number(count.total) : bootstrap.total;
  const models = modelsResponse?.ok ? parseTrustEncarModelsFacet(await modelsResponse.json()).map((model) => model.name) : [];
  return { cars, total, makes: bootstrap.makes.map((make) => make.name), models };
}

export async function getCatalog(filters: CatalogFilters) {
  try {
    return isDefaultBrowse(filters) ? await getBrowseCatalog(filters) : await getLiveCatalog(filters);
  } catch (error) {
    if (!hasDatabase()) throw error;
  }
  const built = buildCatalogQuery(filters);
  const countValues = built.values.slice(0, -2);
  const where = built.text.match(/FROM cars WHERE (.+) ORDER BY/s)?.[1] ?? "status = 'active'";
  const [carsResult, countResult, makesResult, modelsResult] = await Promise.all([
    query<CarRow>(built.text, built.values),
    query<{ count: string }>(`SELECT count(*)::text AS count FROM cars WHERE ${where}`, countValues),
    query<{ make: string }>("SELECT DISTINCT make FROM cars WHERE status = 'active' AND country = $1 ORDER BY make", [filters.country]),
    filters.make
      ? query<{ model: string }>("SELECT DISTINCT model FROM cars WHERE status = 'active' AND country = $1 AND make = $2 ORDER BY model", [filters.country, filters.make])
      : Promise.resolve({ rows: [] as Array<{ model: string }> })
  ]);
  return {
    cars: carsResult.rows.map(toCar),
    total: Number(countResult.rows[0]?.count ?? 0),
    makes: makesResult.rows.map((row) => row.make),
    models: modelsResult.rows.map((row) => row.model)
  };
}

export async function getCarBySlug(slug: string) {
  const id = slug.match(/-(\d+)$/)?.[1];
  if (id) {
    try {
      const response = await fetch(`https://trust-encar.ru/auto/${id}/`, {
        next: { revalidate: 300, tags: [`trust-encar-car-${id}`] },
        signal: AbortSignal.timeout(6_000)
      });
      if (response.ok) {
        const live = parseTrustEncarVehiclePage(await response.text());
        if (live) return fromFeedCar(live);
      }
    } catch {}
  }
  if (!hasDatabase()) return null;
  const result = await query<CarRow>("SELECT * FROM cars WHERE slug = $1 AND status = 'active' LIMIT 1", [slug]).catch(() => null);
  return result?.rows[0] ? toCar(result.rows[0]) : null;
}

export async function getLatestCars(limit = 4) {
  try {
    const live = await getBrowseCatalog(parseCatalogParams({ country: "kr" }));
    return live.cars.slice(0, limit);
  } catch {
    if (!hasDatabase()) return [] as Car[];
  }
  const result = await query<CarRow>("SELECT * FROM cars WHERE status = 'active' ORDER BY year DESC, updated_at DESC LIMIT $1", [limit]);
  return result.rows.map(toCar);
}

export async function searchCars(term: string, limit = 20) {
  if (term.trim().length < 2) return [] as Array<{ slug: string; label: string }>;
  try {
    const live = await getLiveCatalog(parseCatalogParams({ country: "kr", q: term }));
    return live.cars.slice(0, limit).map((car) => ({ slug: car.slug, label: `${car.make} ${car.model}${car.trim ? ` ${car.trim}` : ""} · ${car.year}` }));
  } catch (error) {
    if (!hasDatabase()) throw error;
  }
  const result = await query<{ slug: string; make: string; model: string; trim: string | null; year: number }>(
    `SELECT slug, make, model, trim, year FROM cars
     WHERE status = 'active' AND country = 'kr' AND search_vector @@ plainto_tsquery('simple', $1)
     ORDER BY year DESC, updated_at DESC LIMIT $2`, [term.trim(), Math.min(20, Math.max(1, limit))]
  );
  return result.rows.map((row) => ({ slug: row.slug, label: `${row.make} ${row.model}${row.trim ? ` ${row.trim}` : ""} · ${row.year}` }));
}
