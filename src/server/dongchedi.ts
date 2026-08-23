import { parseDongchediSeriesPage, parseDongchediUsedPage, type ExternalCatalogCar } from "@/domain/external-catalog";

const ENDPOINT = "https://www.dongchedi.com/motor/brand/m/v6/select/series/?city_name=%E5%8C%97%E4%BA%AC";
const USED_ENDPOINT = "https://www.dongchedi.com/motor/pc/sh/sh_sku_list?aid=1839&app_name=auto_web_pc";
type DongchediPage = ReturnType<typeof parseDongchediSeriesPage>;
type DongchediUsedPage = ReturnType<typeof parseDongchediUsedPage>;
let fullCatalogCache: { page: DongchediPage; expiresAt: number } | undefined;
let usedOverviewCache: { key: string; fetcher: typeof fetch; pages: Array<{ city: string; page: DongchediUsedPage }>; total: number; facets: ExternalCatalogCar[]; expiresAt: number } | undefined;

export const DONGCHEDI_USED_CITIES = ["北京", "上海", "广州", "深圳", "成都", "重庆", "杭州", "武汉", "南京", "天津"] as const;
const DONGCHEDI_CITY_BY_SLUG: Record<string, string> = {
  beijing: "北京", shanghai: "上海", guangzhou: "广州", shenzhen: "深圳", chengdu: "成都",
  chongqing: "重庆", hangzhou: "杭州", wuhan: "武汉", nanjing: "南京", tianjin: "天津"
};

export function getDongchediCityBySlug(slug: string) {
  return DONGCHEDI_CITY_BY_SLUG[slug.toLowerCase()] || "全国";
}

export async function fetchDongchediPage(offset: number, limit = 1_000) {
  const isFullCatalog = offset === 0 && limit >= 5_000;
  if (isFullCatalog && fullCatalogCache && fullCatalogCache.expiresAt > Date.now()) return fullCatalogCache.page;
  const response = await fetch(ENDPOINT, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0 AsiaTradeCarCatalog/1.0" },
    body: new URLSearchParams({ offset: String(offset), limit: String(limit), is_refresh: offset ? "0" : "1", city_name: "北京" })
  });
  if (!response.ok) throw new Error(`Dongchedi вернул ${response.status}`);
  const page = parseDongchediSeriesPage(await response.json());
  if (isFullCatalog && !page.cars.length && fullCatalogCache) return fullCatalogCache.page;
  if (!page.cars.length && offset < page.total) throw new Error(`Dongchedi вернул пустую страницу с offset ${offset}`);
  if (isFullCatalog && page.cars.length) fullCatalogCache = { page, expiresAt: Date.now() + 5 * 60_000 };
  return page;
}

export async function fetchDongchediVehicle(id: string) {
  let total = 1;
  for (let offset = 0; offset < total; offset += 1_000) {
    const page = await fetchDongchediPage(offset);
    total = page.total;
    const car = page.cars.find((item) => item.id === `dongchedi-${id}`);
    if (car) return car;
  }
  return null;
}

export async function fetchDongchediUsedPage(page: number, limit = 60, city = "全国", brandId?: string) {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const response = await fetch(USED_ENDPOINT, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0 AsiaTradeCarCatalog/1.0" },
    body: new URLSearchParams({ sh_city_name: city, page: String(safePage), limit: String(safeLimit), ...(brandId ? { brand: brandId } : {}) })
  });
  if (!response.ok) throw new Error(`Dongchedi с пробегом вернул ${response.status}`);
  const parsed = parseDongchediUsedPage(await response.json(), safePage, safeLimit, city, brandId);
  if (!parsed.cars.length && (parsed.hasMore || (safePage - 1) * safeLimit < parsed.total)) throw new Error(`Dongchedi с пробегом вернул пустую страницу ${safePage}`);
  return parsed;
}

async function fetchDongchediUsedOverview(cities: readonly string[]) {
  const key = cities.join("|");
  if (usedOverviewCache?.key === key && usedOverviewCache.fetcher === fetch && usedOverviewCache.expiresAt > Date.now()) return usedOverviewCache;
  const results = await Promise.allSettled(cities.map((city) => fetchDongchediUsedPage(1, 80, city)));
  const pages = results.flatMap((result, index) => result.status === "fulfilled" ? [{ city: cities[index], page: result.value }] : []);
  const facets = [...new Map(pages.flatMap((item) => item.page.cars).map((car) => [car.id, car])).values()];
  const total = pages.reduce((sum, item) => sum + item.page.total, 0);
  const minimumTotal = key === DONGCHEDI_USED_CITIES.join("|") ? 50_000 : 1;
  if (total < minimumTotal) {
    if (usedOverviewCache?.key === key && usedOverviewCache.fetcher === fetch && usedOverviewCache.total >= minimumTotal) return usedOverviewCache;
    throw new Error(`Dongchedi передал ${total} объявлений; ожидалось не меньше ${minimumTotal}`);
  }
  usedOverviewCache = { key, fetcher: fetch, pages, facets, total, expiresAt: Date.now() + 5 * 60_000 };
  return usedOverviewCache;
}

export async function fetchDongchediUsedBrowsePage(offset: number, limit: number, cities: readonly string[] = DONGCHEDI_USED_CITIES) {
  const safeOffset = Math.max(0, Math.floor(offset));
  const safeLimit = Math.min(80, Math.max(1, Math.floor(limit)));
  const overview = await fetchDongchediUsedOverview(cities);
  if (safeOffset >= overview.total) return { cars: [] as ExternalCatalogCar[], total: overview.total, facets: overview.facets };
  let cityIndex = 0;
  let cityOffset = safeOffset;
  while (cityIndex < overview.pages.length && cityOffset >= overview.pages[cityIndex].page.total) cityOffset -= overview.pages[cityIndex++].page.total;
  const cars: ExternalCatalogCar[] = [];
  while (cars.length < safeLimit && cityIndex < overview.pages.length) {
    const pool = overview.pages[cityIndex];
    const pageNumber = Math.floor(cityOffset / 80) + 1;
    const page = pageNumber === 1 ? pool.page : await fetchDongchediUsedPage(pageNumber, 80, pool.city);
    const pageOffset = cityOffset % 80;
    const selected = page.cars.slice(pageOffset, pageOffset + safeLimit - cars.length);
    cars.push(...selected);
    cityOffset += selected.length;
    if (!selected.length || cityOffset >= pool.page.total) { cityIndex += 1; cityOffset = 0; }
  }
  return { cars: [...new Map(cars.map((car) => [car.id, car])).values()], total: overview.total, facets: overview.facets };
}

export async function fetchDongchediUsedCatalog(cities: readonly string[], minimumUnique: number, limit = 80) {
  const firstPages = await Promise.all(cities.map((city) => fetchDongchediUsedPage(1, limit, city)));
  const cars = firstPages.flatMap((result) => result.cars);
  const remaining = firstPages.flatMap((result, cityIndex) => Array.from(
    { length: Math.max(0, Math.ceil(result.total / limit) - 1) },
    (_, index) => ({ city: cities[cityIndex], page: index + 2 })
  ));
  for (let index = 0; index < remaining.length; index += 12) {
    const batch = remaining.slice(index, index + 12);
    const results = await Promise.all(batch.map(({ city, page }) => fetchDongchediUsedPage(page, limit, city)));
    cars.push(...results.flatMap((result) => result.cars));
  }
  const unique = [...new Map(cars.map((car) => [car.id, car])).values()];
  if (unique.length < minimumUnique) throw new Error(`Dongchedi передал ${unique.length} уникальных объявлений; ожидалось не меньше ${minimumUnique}`);
  return { cars: unique, sourceTotal: firstPages.reduce((total, result) => total + result.total, 0) };
}

export async function fetchDongchediUsedVehicle(id: string, page: number, limit: number, city = "全国", brandId?: string) {
  const result = await fetchDongchediUsedPage(page, limit, city, brandId);
  return result.cars.find((car) => car.id === `dongchedi-used-${id}`) || null;
}
