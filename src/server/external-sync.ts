import { getBanzaiCursorWindow, type ExternalCatalogCar } from "@/domain/external-catalog";
import { buildExternalPricing } from "@/domain/pricing";
import { fetchBanzaiPage } from "@/server/banzai";
import { fetchDongchediPage, fetchDongchediUsedCatalog } from "@/server/dongchedi";
import { inTransaction, query } from "@/server/db";
import { getPricingSettings } from "@/server/pricing";

const MIN_DONGCHEDI_SERIES = 4_687;
export const CHINA_MIN_UNIQUE = 50_000;
export const CHINA_SYNC_CITIES = ["北京", "上海", "广州", "深圳", "成都", "重庆", "杭州", "武汉", "南京", "天津"] as const;
const DONGCHEDI_USED_LIMIT = 80;
const CHINA_REFRESH_SECONDS = 23 * 60 * 60;
const JAPAN_NEXT_PAGE = "catalog_banzai_archive_next_page";
const JAPAN_CYCLE_STARTED = "catalog_banzai_archive_cycle_started_epoch";
const JAPAN_LAST_COMPLETED = "catalog_banzai_archive_last_completed_epoch";
const CHINA_LAST_COMPLETED = "catalog_china_last_completed_epoch";

async function fetchChinaCatalog() {
  const [series, used] = await Promise.all([
    fetchDongchediPage(0, 5_000),
    fetchDongchediUsedCatalog(CHINA_SYNC_CITIES, CHINA_MIN_UNIQUE, DONGCHEDI_USED_LIMIT)
  ]);
  const uniqueSeries = [...new Map(series.cars.map((car) => [car.id, car])).values()];
  if (series.total < MIN_DONGCHEDI_SERIES || uniqueSeries.length < MIN_DONGCHEDI_SERIES) throw new Error(`Dongchedi передал ${uniqueSeries.length} из ${series.total} новых моделей; ожидалось не меньше ${MIN_DONGCHEDI_SERIES}`);
  return [...uniqueSeries, ...used.cars];
}

const UPSERT = `WITH incoming AS (
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(id text,slug text,status text,source text,"sourceUrl" text,country text,"currencyCode" text,make text,model text,trim text,year integer,"mileageKm" integer,"engineCc" integer,"powerHp" integer,fuel text,transmission text,drive text,"bodyType" text,"exteriorColor" text,"interiorColor" text,vin text,"sourcePrice" bigint,"priceRub" bigint,photos jsonb,details jsonb)
  ) INSERT INTO cars (id,slug,source,source_url,status,country,currency_code,make,model,trim,year,mileage_km,engine_cc,power_hp,fuel,transmission,drive,body_type,exterior_color,interior_color,vin,price_krw,price_rub,photos,details,last_seen_at,updated_at)
  SELECT id,slug,source,"sourceUrl",status,country,"currencyCode",make,model,trim,year,"mileageKm","engineCc","powerHp",fuel,transmission,drive,"bodyType","exteriorColor","interiorColor",vin,"sourcePrice","priceRub",photos,details,now(),now() FROM incoming
  ON CONFLICT (id) DO UPDATE SET slug=EXCLUDED.slug,source_url=EXCLUDED.source_url,status=EXCLUDED.status,currency_code=EXCLUDED.currency_code,make=EXCLUDED.make,model=EXCLUDED.model,trim=EXCLUDED.trim,year=EXCLUDED.year,mileage_km=EXCLUDED.mileage_km,engine_cc=EXCLUDED.engine_cc,power_hp=EXCLUDED.power_hp,fuel=EXCLUDED.fuel,transmission=EXCLUDED.transmission,drive=EXCLUDED.drive,body_type=EXCLUDED.body_type,exterior_color=EXCLUDED.exterior_color,interior_color=EXCLUDED.interior_color,vin=EXCLUDED.vin,price_krw=EXCLUDED.price_krw,price_rub=EXCLUDED.price_rub,photos=EXCLUDED.photos,details=EXCLUDED.details,last_seen_at=now(),updated_at=now()`;

type PricingSettings = Awaited<ReturnType<typeof getPricingSettings>>;

function priceCars(cars: ExternalCatalogCar[], settings: PricingSettings) {
  return cars.map((car) => {
    const pricing = car.sourcePrice > 0 ? buildExternalPricing(car.country, car.sourcePrice, settings.rates[car.currencyCode]) : null;
    return { ...car, priceRub: pricing?.priceRub ?? null, details: { ...car.details, costBreakdown: pricing?.costBreakdown ?? [] } };
  });
}

async function readState(key: string, fallback: number) {
  const result = await query<{ value: string }>("SELECT value::text FROM site_settings WHERE key = $1", [key]);
  const value = Number(result.rows[0]?.value);
  return Number.isFinite(value) ? value : fallback;
}

async function writeState(client: import("pg").PoolClient, key: string, value: number) {
  await client.query("INSERT INTO site_settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()", [key, value]);
}

async function upsertPayload(client: import("pg").PoolClient, payload: ReturnType<typeof priceCars>) {
  for (let index = 0; index < payload.length; index += 1_000) await client.query(UPSERT, [JSON.stringify(payload.slice(index, index + 1_000))]);
}

async function syncJapan(settings: PricingSettings, now: Date) {
  const nowSeconds = Math.floor(now.getTime() / 1_000);
  const first = await fetchBanzaiPage(1);
  const savedNextPage = await readState(JAPAN_NEXT_PAGE, 1);
  const window = getBanzaiCursorWindow(first.totalPages, savedNextPage);
  const savedCycleStarted = await readState(JAPAN_CYCLE_STARTED, 0);
  const cycleStarted = window.start === 1 || !savedCycleStarted ? nowSeconds : savedCycleStarted;
  const pages = Array.from({ length: Math.max(0, window.end - window.start + 1) }, (_, index) => window.start + index);
  let received = 0;
  for (let index = 0; index < pages.length; index += 4) {
    const batch = pages.slice(index, index + 4);
    const results = await Promise.all(batch.map((page) => page === 1 ? first : fetchBanzaiPage(page)));
    const payload = priceCars(results.flatMap((result) => result.cars), settings);
    const lastPage = batch.at(-1) || window.start;
    const completed = lastPage >= first.totalPages;
    await inTransaction(async (client) => {
      await upsertPayload(client, payload);
      await writeState(client, JAPAN_NEXT_PAGE, completed ? 1 : lastPage + 1);
      await writeState(client, JAPAN_CYCLE_STARTED, completed ? nowSeconds : cycleStarted);
      if (completed) {
        await client.query("UPDATE cars SET status='inactive',updated_at=now() WHERE source='banzai24' AND last_seen_at < $1", [new Date(cycleStarted * 1_000)]);
        await writeState(client, JAPAN_LAST_COMPLETED, nowSeconds);
      }
    });
    received += payload.length;
  }
  return { received, pages: window, total: first.total, totalPages: first.totalPages };
}

async function syncChina(settings: PricingSettings, now: Date) {
  const nowSeconds = Math.floor(now.getTime() / 1_000);
  const lastCompleted = await readState(CHINA_LAST_COMPLETED, 0);
  if (lastCompleted && nowSeconds - lastCompleted < CHINA_REFRESH_SECONDS) return { received: 0, skipped: true };
  const startedAt = new Date();
  const cars = await fetchChinaCatalog();
  const payload = priceCars(cars, settings);
  await inTransaction(async (client) => {
    await client.query("SET LOCAL statement_timeout = '30s'");
    await upsertPayload(client, payload);
    await client.query("UPDATE cars SET status='inactive',updated_at=now() WHERE source IN ('dongchedi','dongchedi-used') AND last_seen_at < $1", [startedAt]);
    await writeState(client, CHINA_LAST_COMPLETED, nowSeconds);
  });
  return { received: cars.length, skipped: false };
}

export async function syncExternalCatalogs(now = new Date()) {
  const settings = await getPricingSettings();
  const [japan, china] = await Promise.all([syncJapan(settings, now), syncChina(settings, now)]);
  return { received: japan.received + china.received, japan, china };
}
