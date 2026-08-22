import { parseDongchediSeriesPage } from "@/domain/external-catalog";

const ENDPOINT = "https://www.dongchedi.com/motor/brand/m/v6/select/series/?city_name=%E5%8C%97%E4%BA%AC";

export async function fetchDongchediPage(offset: number, limit = 1_000) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0 AsiaTradeCarCatalog/1.0" },
    body: new URLSearchParams({ offset: String(offset), limit: String(limit), is_refresh: offset ? "0" : "1", city_name: "北京" })
  });
  if (!response.ok) throw new Error(`Dongchedi вернул ${response.status}`);
  const page = parseDongchediSeriesPage(await response.json());
  if (!page.cars.length && offset < page.total) throw new Error(`Dongchedi вернул пустую страницу с offset ${offset}`);
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
