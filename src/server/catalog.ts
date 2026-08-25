import type { CatalogFilters } from "../domain/catalog";
import { buildCatalogQuery, catalogStatusClause, parseCatalogParams } from "../domain/catalog";
import { buildTrustEncarSearchBody, normalizeTrustEncarRecord, parseTrustEncarBootstrap, parseTrustEncarCatalogPage, parseTrustEncarGenerationsFacet, parseTrustEncarModelsFacet, parseTrustEncarVehiclePage, type TrustEncarCatalogCar } from "../domain/sync";
import { hasDatabase, query } from "./db";
import { getPricingSettings } from "./pricing";
import { readCostBreakdown } from "../domain/car-details";
import { buildExternalPricing, DEFAULT_COMMISSION_RUB, DEFAULT_COMMISSIONS_RUB, KOREA_BROKER_RUB, type CustomsCostsRub } from "../domain/pricing";
import { proxyBanzaiPhotoUrl, type ExternalCatalogCar } from "../domain/external-catalog";
import { fetchBanzaiMakes, fetchBanzaiModels, fetchBanzaiPage, fetchBanzaiVehicle, type BanzaiCatalogSelection } from "./banzai";
import { fetchDongchediPage, fetchDongchediUsedBrowsePage, fetchDongchediUsedPage, fetchDongchediUsedVehicle, fetchDongchediVehicle, fetchDongchediVehicleSpecs, getDongchediCityBySlug } from "./dongchedi";
import { getDromCustomsCostsRub } from "./drom";
import { ensureDatabaseSchema } from "./schema";

const TRUST_ENCAR_BROKER_RUB = 60_000;

export type Car = {
  id: string;
  slug: string;
  sourceUrl: string | null;
  country: string;
  currencyCode: "KRW" | "JPY" | "CNY";
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
  id: string; slug: string; source_url: string | null; country: string; currency_code?: string; make: string; model: string; trim: string | null; year: number;
  mileage_km: number; engine_cc: number | null; power_hp: number | null; fuel: string | null;
  transmission: string | null; drive: string | null; body_type: string | null;
  exterior_color: string | null; interior_color: string | null; vin: string | null;
  price_krw: string | number; price_rub: string | number | null; photos: unknown; details: unknown;
};

const displayModel = (country: string, make: string, model: string) => country === "cn" && /^Model\s+\d{3,}$/i.test(model.trim()) ? make : model;

const toCar = (row: CarRow): Car => ({
  id: row.id, slug: row.slug, sourceUrl: row.source_url, country: row.country, currencyCode: ["JPY", "CNY"].includes(row.currency_code || "") ? row.currency_code as "JPY" | "CNY" : "KRW", make: row.make, model: displayModel(row.country, row.make, row.model), trim: row.trim, year: row.year,
  mileageKm: row.mileage_km, engineCc: row.engine_cc, powerHp: row.power_hp, fuel: row.fuel,
  transmission: row.transmission, drive: row.drive, bodyType: row.body_type,
  exteriorColor: row.exterior_color, interiorColor: row.interior_color, vin: row.vin,
  priceKrw: Number(row.price_krw), priceRub: row.price_rub === null ? null : Number(row.price_rub),
  photos: Array.isArray(row.photos) ? row.photos.filter((item): item is string => typeof item === "string").map(proxyBanzaiPhotoUrl) : [],
  details: row.details && typeof row.details === "object" ? row.details as Record<string, unknown> : {}
});

const fromFeedCar = (car: TrustEncarCatalogCar): Car => ({
  id: car.id, slug: car.slug, sourceUrl: null, country: "kr", currencyCode: "KRW", make: car.make, model: car.model, trim: car.trim, year: car.year,
  mileageKm: car.mileageKm, engineCc: car.engineCc, powerHp: car.powerHp, fuel: car.fuel,
  transmission: car.transmission, drive: car.drive, bodyType: car.bodyType,
  exteriorColor: car.exteriorColor, interiorColor: car.interiorColor, vin: car.vin,
  priceKrw: car.priceKrw, priceRub: car.priceRub, photos: car.photos, details: car.details
});

function moneyFromLine(raw: unknown, pattern: RegExp, fallback: number) {
  if (!Array.isArray(raw)) return fallback;
  const line = raw.find((item) => item && typeof item === "object" && pattern.test(String((item as { label?: unknown }).label || ""))) as { value?: unknown } | undefined;
  return Number(String(line?.value || "").replace(/[^\d]/g, "")) || fallback;
}

export function applyCommission(car: Car, commissionRub: number, includedFees = true): Car {
  const raw = Array.isArray(car.details.costBreakdown) ? car.details.costBreakdown : [];
  const previousCommission = moneyFromLine(raw, /комисси/i, includedFees ? DEFAULT_COMMISSION_RUB : 0);
  const previousBroker = moneyFromLine(raw, /брокер/i, includedFees ? TRUST_ENCAR_BROKER_RUB : 0);
  return { ...car, priceRub: car.priceRub ? car.priceRub - previousCommission - previousBroker + commissionRub + KOREA_BROKER_RUB : car.priceRub, details: { ...car.details, costBreakdown: readCostBreakdown(car.details, commissionRub, KOREA_BROKER_RUB) } };
}

const fromExternalCar = (car: ExternalCatalogCar): Car => ({
  id: car.id, slug: car.slug, sourceUrl: car.sourceUrl, country: car.country, currencyCode: car.currencyCode,
  make: car.make, model: car.model, trim: car.trim, year: car.year, mileageKm: car.mileageKm,
  engineCc: car.engineCc, powerHp: car.powerHp, fuel: car.fuel, transmission: car.transmission,
  drive: car.drive, bodyType: car.bodyType, exteriorColor: car.exteriorColor, interiorColor: car.interiorColor,
  vin: car.vin, priceKrw: car.sourcePrice, priceRub: null, photos: car.photos.map(proxyBanzaiPhotoUrl), details: car.details
});

function applyExternalPricing(car: Car, rubPerUnit: number, customs: CustomsCostsRub = {}, commissionRub = DEFAULT_COMMISSION_RUB): Car {
  const country = car.country === "jp" ? "jp" : "cn";
  if (!car.priceKrw) return car;
  const pricing = buildExternalPricing(country, car.priceKrw, rubPerUnit, customs, commissionRub);
  return { ...car, priceRub: pricing.priceRub, details: { ...car.details, customsSource: Object.keys(customs).length ? "Drom" : car.details.customsSource, costBreakdown: pricing.costBreakdown } };
}

async function applyExternalCatalogPricing(cars: Car[], settings: Awaited<ReturnType<typeof getPricingSettings>>) {
  return Promise.all(cars.map(async (car) => {
    const country = car.country === "jp" ? "jp" : "cn";
    let detailed = car;
    if (country === "cn" && (!car.engineCc || !car.powerHp || car.year < 1900)) {
      const seriesId = String(car.details.seriesId || "");
      const carIds = Array.isArray(car.details.carIds) ? car.details.carIds.map(String) : [];
      const carId = String(car.details.carId || carIds[0] || "");
      const specs = seriesId && carId ? await fetchDongchediVehicleSpecs(seriesId, carId).catch(() => null) : null;
      if (specs) detailed = { ...car, engineCc: specs.engineCc, powerHp: specs.powerHp, fuel: specs.fuel, year: specs.year || car.year };
    }
    const currency = country === "jp" ? "YEN" : "CNY";
    const customs = detailed.engineCc && detailed.year >= 1900
      ? await getDromCustomsCostsRub({ sourcePrice: detailed.priceKrw, currency, year: detailed.year, engineCc: detailed.engineCc, powerHp: detailed.powerHp, fuel: detailed.fuel }).catch(() => null)
      : null;
    return applyExternalPricing(detailed, settings.rates[detailed.currencyCode], customs || {}, settings.commissions[country]);
  }));
}

async function getExternalBrowseCatalog(filters: CatalogFilters) {
  const settingsPromise = getPricingSettings();
  if (filters.country === "cn") {
    const settings = await settingsPromise;
    const same = (left: string, right: string | undefined) => left.localeCompare(right || "", undefined, { sensitivity: "base" }) === 0;
    const hasFilters = Boolean(filters.q || filters.make || filters.model || filters.yearFrom !== undefined || filters.yearTo !== undefined
      || filters.priceFrom !== undefined || filters.priceTo !== undefined || filters.mileageTo !== undefined || filters.bodyType || filters.fuel
      || filters.drive || filters.engineFrom !== undefined || filters.engineTo !== undefined || filters.powerFrom !== undefined || filters.powerTo !== undefined
      || filters.sort !== "newest");
    if (!hasFilters) {
      let used: Awaited<ReturnType<typeof fetchDongchediUsedBrowsePage>> | undefined;
      try {
        used = await fetchDongchediUsedBrowsePage(filters.offset, filters.limit);
      } catch {}
      if (used?.total) {
        const cars = await applyExternalCatalogPricing(used.cars.map(fromExternalCar), settings);
        const makes = [...new Set(used.facets.map((car) => car.make))].sort();
        return { cars, total: used.total, makes, models: [], generations: [] };
      }
      const series = await fetchDongchediPage(0, 5_000);
      const cars = await applyExternalCatalogPricing(series.cars.slice(filters.offset, filters.offset + filters.limit).map(fromExternalCar), settings);
      return { cars, total: series.total, makes: [...new Set(series.cars.map((car) => car.make))].sort(), models: [], generations: [] };
    }
    const page = await fetchDongchediPage(0, 5_000);
    let makes = [...new Set(page.cars.map((car) => car.make))].sort();
    let makeCars = filters.make ? page.cars.filter((car) => same(car.make, filters.make)) : page.cars;
    const newMakeCars = makeCars;
    let usedTotal: number | undefined;
    try {
      const overview = await fetchDongchediUsedBrowsePage(filters.make ? 0 : filters.offset, filters.make ? 1 : filters.limit);
      makes = [...new Set([...makes, ...overview.facets.map((car) => car.make)])].sort();
      if (filters.make) {
        const makeFacet = overview.facets.find((car) => same(car.make, filters.make));
        const brandId = String(makeFacet?.details.brandId || "");
        if (brandId) {
          const used = await fetchDongchediUsedPage(Math.floor(filters.offset / filters.limit) + 1, filters.limit, "全国", brandId);
          makeCars = filters.offset === 0 ? [...newMakeCars, ...used.cars] : used.cars;
          usedTotal = used.total + newMakeCars.length;
        }
      } else {
        makeCars = overview.cars;
        usedTotal = overview.total;
      }
    } catch {}
    const models = filters.make ? [...new Set(makeCars.map((car) => car.model))].sort() : [];
    const filtered = makeCars
      .filter((car) => !filters.model || same(car.model, filters.model))
      .filter((car) => !filters.q || `${car.make} ${car.model} ${car.trim || ""}`.toLocaleLowerCase().includes(filters.q.toLocaleLowerCase()))
      .map(fromExternalCar)
      .filter((car) => filters.yearFrom === undefined || car.year >= filters.yearFrom)
      .filter((car) => filters.yearTo === undefined || car.year <= filters.yearTo)
      .filter((car) => filters.mileageTo === undefined || car.mileageKm <= filters.mileageTo);
    const priced = (await applyExternalCatalogPricing(filtered, settings))
      .filter((car) => filters.priceFrom === undefined || (car.priceRub !== null && car.priceRub >= filters.priceFrom))
      .filter((car) => filters.priceTo === undefined || (car.priceRub !== null && car.priceRub <= filters.priceTo));
    priced.sort((left, right) => filters.sort === "price-asc" ? (left.priceRub || Infinity) - (right.priceRub || Infinity)
      : filters.sort === "price-desc" ? (right.priceRub || 0) - (left.priceRub || 0)
      : filters.sort === "mileage" ? left.mileageKm - right.mileageKm
      : right.year - left.year);
    const narrowed = Boolean(filters.q || filters.model || filters.yearFrom !== undefined || filters.yearTo !== undefined
      || filters.priceFrom !== undefined || filters.priceTo !== undefined || filters.mileageTo !== undefined || filters.bodyType || filters.fuel
      || filters.drive || filters.engineFrom !== undefined || filters.engineTo !== undefined || filters.powerFrom !== undefined || filters.powerTo !== undefined);
    return {
      cars: usedTotal === undefined ? priced.slice(filters.offset, filters.offset + filters.limit) : priced.slice(0, filters.limit),
      total: usedTotal !== undefined && !narrowed ? usedTotal : priced.length,
      makes, models, generations: []
    };
  }
  const sourcePage = Math.floor(filters.offset / 100) + 1;
  const start = filters.offset % 100;
  const baseSelection: BanzaiCatalogSelection = { yearFrom: filters.yearFrom, yearTo: filters.yearTo, mileageTo: filters.mileageTo, sort: filters.sort };
  const directPage = !filters.make && !filters.model ? fetchBanzaiPage(sourcePage, 100, baseSelection) : null;
  const [settings, makeOptions] = await Promise.all([settingsPromise, fetchBanzaiMakes()]);
  const makes = makeOptions.map((item) => item.name).sort();
  const selectedMake = filters.make;
  const make = selectedMake ? makeOptions.find((item) => item.name.localeCompare(selectedMake, undefined, { sensitivity: "base" }) === 0) : undefined;
  if (filters.make && !make) return { cars: [] as Car[], total: 0, makes, models: [] as string[], generations: [] };
  const modelOptions = make ? await fetchBanzaiModels(make.id) : [];
  const models = modelOptions.map((item) => item.name).sort();
  const selectedModel = filters.model;
  const model = selectedModel ? modelOptions.find((item) => item.name.localeCompare(selectedModel, undefined, { sensitivity: "base" }) === 0) : undefined;
  if (filters.model && !model) return { cars: [] as Car[], total: 0, makes, models, generations: [] };
  const selection: BanzaiCatalogSelection = { ...baseSelection, companyId: make?.id, modelId: model?.id };
  const first = directPage ? await directPage : await fetchBanzaiPage(sourcePage, 100, selection);
  const pages = start + filters.limit > first.cars.length && sourcePage < first.totalPages ? [first, await fetchBanzaiPage(sourcePage + 1, 100, selection)] : [first];
  const sourceCars = pages.flatMap((page) => page.cars);
  const cars = (await applyExternalCatalogPricing(sourceCars.slice(start, start + filters.limit).map(fromExternalCar), settings))
    .filter((car) => filters.priceFrom === undefined || (car.priceRub !== null && car.priceRub >= filters.priceFrom))
    .filter((car) => filters.priceTo === undefined || (car.priceRub !== null && car.priceRub <= filters.priceTo));
  return { cars, total: first.total, makes, models, generations: [] };
}

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
  return { cars: parsed.cars.map(fromFeedCar), total: parsed.total, makes: parsed.makes, models: [] as string[], generations: [] };
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
    body: new URLSearchParams({ action: "ajax_facets_state_db", nonce: bootstrap.nonce, marka_id: make.id, ...(modelId ? { model_id: modelId } : {}) }),
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
      sourceUrl: null,
      country: "kr",
      currencyCode: "KRW",
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
  const facets = modelsResponse?.ok ? await modelsResponse.json() : null;
  const models = parseTrustEncarModelsFacet(facets).map((model) => model.name);
  const generations = parseTrustEncarGenerationsFacet(facets);
  return { cars, total, makes: bootstrap.makes.map((make) => make.name), models, generations };
}

async function getDatabaseCatalog(filters: CatalogFilters) {
  await ensureDatabaseSchema();
  const legacyChinaModel = filters.country === "cn" && filters.make && filters.model
    && filters.make.localeCompare(filters.model, undefined, { sensitivity: "base" }) === 0;
  const built = buildCatalogQuery(legacyChinaModel ? { ...filters, model: undefined } : filters);
  const statusClause = catalogStatusClause(filters.country);
  const countValues = built.values.slice(0, -2);
  const where = built.text.match(/FROM cars WHERE (.+) ORDER BY/s)?.[1] ?? "status = 'active'";
  const [carsResult, countResult, makesResult, modelsResult] = await Promise.all([
    query<CarRow>(built.text, built.values),
    query<{ count: string }>(`SELECT count(*)::text AS count FROM cars WHERE ${where}`, countValues),
    query<{ make: string }>(`SELECT DISTINCT make FROM cars WHERE ${statusClause} AND country = $1 ORDER BY make`, [filters.country]),
    filters.make ? query<{ model: string }>(`SELECT DISTINCT model FROM cars WHERE ${statusClause} AND country = $1 AND make = $2 ORDER BY model`, [filters.country, filters.make]) : Promise.resolve({ rows: [] as Array<{ model: string }> })
  ]);
  const models = [...new Set(modelsResult.rows.map((row) => displayModel(filters.country, filters.make || "", row.model)))].sort();
  return { cars: carsResult.rows.map(toCar), total: Number(countResult.rows[0]?.count ?? 0), makes: makesResult.rows.map((row) => row.make), models, generations: [] };
}

function adjustDatabasePriceFilters(filters: CatalogFilters, commissionRub: number): CatalogFilters {
  const adjustment = filters.country === "kr" ? commissionRub + KOREA_BROKER_RUB : commissionRub - DEFAULT_COMMISSIONS_RUB[filters.country === "jp" ? "jp" : "cn"];
  return {
    ...filters,
    priceFrom: filters.priceFrom === undefined ? undefined : Math.max(0, filters.priceFrom - adjustment),
    priceTo: filters.priceTo === undefined ? undefined : Math.max(0, filters.priceTo - adjustment)
  };
}

function adjustKoreaLivePriceFilters(filters: CatalogFilters, commissionRub: number): CatalogFilters {
  const adjustment = commissionRub + KOREA_BROKER_RUB - DEFAULT_COMMISSION_RUB - TRUST_ENCAR_BROKER_RUB;
  return {
    ...filters,
    priceFrom: filters.priceFrom === undefined ? undefined : Math.max(0, filters.priceFrom - adjustment),
    priceTo: filters.priceTo === undefined ? undefined : Math.max(0, filters.priceTo - adjustment)
  };
}

async function hasSyncedChinaCatalog() {
  if (!hasDatabase()) return false;
  try {
    const result = await query<{ ready: boolean }>(`SELECT (
      count(*) FILTER (WHERE source = 'dongchedi-used' AND status = 'active') >= 50000
    ) AS ready FROM cars WHERE country = 'cn'`, []);
    return result.rows[0]?.ready === true;
  } catch {
    return false;
  }
}

async function hasSyncedJapanArchive() {
  if (!hasDatabase()) return false;
  try {
    const result = await query<{ ready: boolean }>(`SELECT (
      EXISTS (SELECT 1 FROM site_settings WHERE key = 'catalog_banzai_archive_last_completed_epoch')
      AND EXISTS (SELECT 1 FROM cars WHERE country = 'jp' AND details->>'catalogSection' = 'archive')
    ) AS ready`, []);
    return result.rows[0]?.ready === true;
  } catch {
    return false;
  }
}

export async function getCatalog(filters: CatalogFilters) {
  if (filters.country === "jp" || filters.country === "cn") {
    const databaseReady = filters.country === "jp" ? await hasSyncedJapanArchive() : await hasSyncedChinaCatalog();
    if (databaseReady) {
      try {
        const settings = await getPricingSettings();
        const country = filters.country === "jp" ? "jp" : "cn";
        const catalog = await getDatabaseCatalog(adjustDatabasePriceFilters(filters, settings.commissions[country]));
        return { ...catalog, cars: await applyExternalCatalogPricing(catalog.cars, settings) };
      } catch {}
    }
    return getExternalBrowseCatalog(filters);
  }
  try {
    const settings = await getPricingSettings();
    const catalog = await (isDefaultBrowse(filters) ? getBrowseCatalog(filters) : getLiveCatalog(adjustKoreaLivePriceFilters(filters, settings.commissions.kr)));
    const expected = Math.min(filters.limit, Math.max(0, catalog.total - filters.offset));
    const live = { ...catalog, cars: catalog.cars.map((car) => applyCommission(car, settings.commissions.kr)) };
    if (!hasDatabase() || catalog.cars.length >= expected) return live;
    try {
      const database = await getDatabaseCatalog(adjustDatabasePriceFilters(filters, settings.commissions.kr));
      if (database.cars.length >= expected) return { ...database, cars: database.cars.map((car) => applyCommission(car, settings.commissions.kr, false)) };
    } catch {}
    return live;
  } catch (error) {
    if (!hasDatabase()) throw error;
  }
  const settings = await getPricingSettings();
  const catalog = await getDatabaseCatalog(adjustDatabasePriceFilters(filters, settings.commissions.kr));
  return { ...catalog, cars: catalog.cars.map((car) => applyCommission(car, settings.commissions.kr, false)) };
}

export async function getCarBySlug(slug: string) {
  const id = slug.match(/-(\d+)$/)?.[1];
  if (id && !slug.startsWith("cn-") && !slug.startsWith("jp-")) {
    try {
      const response = await fetch(`https://trust-encar.ru/auto/${id}/`, {
        next: { revalidate: 300, tags: [`trust-encar-car-${id}`] },
        signal: AbortSignal.timeout(6_000)
      });
      if (response.ok) {
        const live = parseTrustEncarVehiclePage(await response.text());
        if (live) return applyCommission(fromFeedCar(live), (await getPricingSettings()).commissions.kr);
      }
    } catch {}
  }
  if (slug.startsWith("jp-")) {
    const sourceId = slug.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)?.[1];
    if (sourceId) {
      try {
        const [external, settings] = await Promise.all([fetchBanzaiVehicle(sourceId), getPricingSettings()]);
        if (external) {
          return (await applyExternalCatalogPricing([fromExternalCar(external)], settings))[0];
        }
      } catch {}
    }
  }
  if (slug.startsWith("cn-used-")) {
    const source = slug.match(/-(\d+)-(\d+)-(\d+)$/);
    if (source) {
      try {
        const pool = slug.match(/-pool-([a-z0-9-]+)-(\d+)-(\d+)-(\d+)$/i);
        const city = pool ? getDongchediCityBySlug(pool[1]) : "全国";
        const brandId = slug.match(/-brand-(\d+)-\d+-\d+-\d+$/)?.[1];
        const [external, settings] = await Promise.all([fetchDongchediUsedVehicle(source[3], Number(source[1]), Number(source[2]), city, brandId), getPricingSettings()]);
        if (external) return (await applyExternalCatalogPricing([fromExternalCar(external)], settings))[0];
      } catch {}
    }
  } else if (slug.startsWith("cn-")) {
    const sourceId = slug.match(/-(\d+)$/)?.[1];
    if (sourceId) {
      try {
        const [external, settings] = await Promise.all([fetchDongchediVehicle(sourceId), getPricingSettings()]);
        if (external) return (await applyExternalCatalogPricing([fromExternalCar(external)], settings))[0];
      } catch {}
    }
  }
  if (!hasDatabase()) return null;
  const result = await query<CarRow>("SELECT * FROM cars WHERE slug = $1 AND (status = 'active' OR country = 'jp') LIMIT 1", [slug]).catch(() => null);
  if (!result?.rows[0]) return null;
  const car = toCar(result.rows[0]);
  const settings = await getPricingSettings();
  if (car.country === "jp") {
    return (await applyExternalCatalogPricing([car], settings))[0];
  }
  if (car.country === "cn") return (await applyExternalCatalogPricing([car], settings))[0];
  return applyCommission(car, settings.commissions.kr, false);
}

export async function getSitemapCars() {
  if (!hasDatabase()) return [];
  try {
    await ensureDatabaseSchema();
    const result = await query<{ slug: string; updated_at: Date; photos: unknown }>(
      "SELECT slug, updated_at, photos FROM cars WHERE status = 'active' AND slug <> '' ORDER BY updated_at DESC LIMIT 50000",
      []
    );
    return result.rows.map((row) => ({
      slug: row.slug,
      updatedAt: row.updated_at,
      image: Array.isArray(row.photos) && typeof row.photos[0] === "string" ? row.photos[0] : undefined
    }));
  } catch {
    return [];
  }
}

export async function getLatestCars(limit = 4) {
  try {
    const [live, settings] = await Promise.all([getBrowseCatalog(parseCatalogParams({ country: "kr" })), getPricingSettings()]);
    return live.cars.slice(0, limit).map((car) => applyCommission(car, settings.commissions.kr));
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
