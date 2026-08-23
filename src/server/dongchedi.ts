import { parseDongchediSeriesPage, parseDongchediUsedPage } from "@/domain/external-catalog";

const ENDPOINT = "https://www.dongchedi.com/motor/brand/m/v6/select/series/?city_name=%E5%8C%97%E4%BA%AC";
const USED_ENDPOINT = "https://www.dongchedi.com/motor/pc/sh/sh_sku_list?aid=1839&app_name=auto_web_pc";
type DongchediPage = ReturnType<typeof parseDongchediSeriesPage>;
let fullCatalogCache: { page: DongchediPage; expiresAt: number } | undefined;

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

export async function fetchDongchediUsedPage(page: number, limit = 60) {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const response = await fetch(USED_ENDPOINT, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0 AsiaTradeCarCatalog/1.0" },
    body: new URLSearchParams({ sh_city_name: "全国", page: String(safePage), limit: String(safeLimit) })
  });
  if (!response.ok) throw new Error(`Dongchedi с пробегом вернул ${response.status}`);
  const parsed = parseDongchediUsedPage(await response.json(), safePage, safeLimit);
  if (!parsed.cars.length && (parsed.hasMore || (safePage - 1) * safeLimit < parsed.total)) throw new Error(`Dongchedi с пробегом вернул пустую страницу ${safePage}`);
  return parsed;
}

export async function fetchDongchediUsedVehicle(id: string, page: number, limit: number) {
  const result = await fetchDongchediUsedPage(page, limit);
  return result.cars.find((car) => car.id === `dongchedi-used-${id}`) || null;
}
