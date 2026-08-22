import { parseBanzaiCatalog, parseDongchediSeriesPage, type ExternalCatalogCar } from "@/domain/external-catalog";
import { applyCatalogPricing } from "@/domain/pricing";
import { inTransaction } from "@/server/db";
import { getPricingSettings } from "@/server/pricing";

const MIN_DONGCHEDI_SERIES = 4_687;

async function fetchCatalogs() {
  const headers = { "User-Agent": "Mozilla/5.0 AsiaTradeCarCatalog/1.0" };
  const japan = await fetch("https://banzai24.com/", { headers, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!japan.ok) throw new Error(`Banzai24 вернул ${japan.status}`);
  const endpoint = "https://www.dongchedi.com/motor/brand/m/v6/select/series/?city_name=%E5%8C%97%E4%BA%AC";
  const chinaResponse = await fetch(endpoint, {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(45_000),
    headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ offset: "0", limit: "5000", is_refresh: "1", city_name: "北京" })
  });
  if (!chinaResponse.ok) throw new Error(`Dongchedi вернул ${chinaResponse.status}`);
  const china = parseDongchediSeriesPage(await chinaResponse.json());
  if (china.total < MIN_DONGCHEDI_SERIES || china.cars.length !== china.total) throw new Error(`Dongchedi передал ${china.cars.length} из ${china.total} машин; ожидалось не меньше ${MIN_DONGCHEDI_SERIES}`);
  const japanCars = parseBanzaiCatalog(await japan.text()).cars;
  if (!japanCars.length) throw new Error("Banzai24 вернул пустой каталог");
  return [...japanCars, ...china.cars];
}

export async function syncExternalCatalogs() {
  const cars = await fetchCatalogs();
  if (!cars.length) throw new Error("Внешние каталоги вернули пустой список");
  const settings = await getPricingSettings();
  const payload = cars.map((car: ExternalCatalogCar) => ({
    ...car, priceRub: car.sourcePrice > 0 ? applyCatalogPricing(car.sourcePrice, settings.rates[car.currencyCode], settings.commissionRub) : null
  }));
  const startedAt = new Date();
  await inTransaction(async (client) => {
    await client.query(`WITH incoming AS (
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(id text,slug text,source text,"sourceUrl" text,country text,"currencyCode" text,make text,model text,trim text,year integer,"mileageKm" integer,"engineCc" integer,"powerHp" integer,fuel text,transmission text,drive text,"bodyType" text,"exteriorColor" text,"interiorColor" text,vin text,"sourcePrice" bigint,"priceRub" bigint,photos jsonb,details jsonb)
  ) INSERT INTO cars (id,slug,source,source_url,status,country,currency_code,make,model,trim,year,mileage_km,engine_cc,power_hp,fuel,transmission,drive,body_type,exterior_color,interior_color,vin,price_krw,price_rub,photos,details,last_seen_at,updated_at)
  SELECT id,slug,source,"sourceUrl",'active',country,"currencyCode",make,model,trim,year,"mileageKm","engineCc","powerHp",fuel,transmission,drive,"bodyType","exteriorColor","interiorColor",vin,"sourcePrice","priceRub",photos,details,now(),now() FROM incoming
  ON CONFLICT (id) DO UPDATE SET slug=EXCLUDED.slug,source_url=EXCLUDED.source_url,status='active',currency_code=EXCLUDED.currency_code,make=EXCLUDED.make,model=EXCLUDED.model,trim=EXCLUDED.trim,year=EXCLUDED.year,mileage_km=EXCLUDED.mileage_km,engine_cc=EXCLUDED.engine_cc,power_hp=EXCLUDED.power_hp,fuel=EXCLUDED.fuel,transmission=EXCLUDED.transmission,exterior_color=EXCLUDED.exterior_color,price_krw=EXCLUDED.price_krw,price_rub=EXCLUDED.price_rub,photos=EXCLUDED.photos,details=EXCLUDED.details,last_seen_at=now(),updated_at=now()`, [JSON.stringify(payload)]);
    await client.query("UPDATE cars SET status='inactive',updated_at=now() WHERE source='dongchedi' AND last_seen_at < $1", [startedAt]);
  });
  return { received: cars.length, japan: cars.filter((car) => car.country === "jp").length, china: cars.filter((car) => car.country === "cn").length };
}
