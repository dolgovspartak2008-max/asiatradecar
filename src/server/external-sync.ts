import { parseBanzaiCatalog, parseDongchediCatalog, type ExternalCatalogCar } from "@/domain/external-catalog";
import { applyCatalogPricing } from "@/domain/pricing";
import { query } from "@/server/db";
import { getPricingSettings } from "@/server/pricing";

async function fetchCatalogs() {
  const headers = { "User-Agent": "Mozilla/5.0 AsiaTradeCarCatalog/1.0" };
  const [japan, china] = await Promise.all([
    fetch("https://banzai24.com/", { headers, cache: "no-store", signal: AbortSignal.timeout(20_000) }),
    fetch("https://www.dongchedi.com/", { headers, cache: "no-store", signal: AbortSignal.timeout(20_000) })
  ]);
  if (!japan.ok || !china.ok) throw new Error(`Внешние каталоги не ответили: JP ${japan.status}, CN ${china.status}`);
  return [...parseBanzaiCatalog(await japan.text()).cars, ...parseDongchediCatalog(await china.text())];
}

export async function syncExternalCatalogs() {
  const cars = await fetchCatalogs();
  if (!cars.length) throw new Error("Внешние каталоги вернули пустой список");
  const settings = await getPricingSettings();
  const payload = cars.map((car: ExternalCatalogCar) => ({
    ...car, priceRub: applyCatalogPricing(car.sourcePrice, settings.rates[car.currencyCode], settings.commissionRub)
  }));
  await query(`WITH incoming AS (
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(id text,slug text,source text,"sourceUrl" text,country text,"currencyCode" text,make text,model text,trim text,year integer,"mileageKm" integer,"engineCc" integer,"powerHp" integer,fuel text,transmission text,drive text,"bodyType" text,"exteriorColor" text,"interiorColor" text,vin text,"sourcePrice" bigint,"priceRub" bigint,photos jsonb,details jsonb)
  ) INSERT INTO cars (id,slug,source,source_url,status,country,currency_code,make,model,trim,year,mileage_km,engine_cc,power_hp,fuel,transmission,drive,body_type,exterior_color,interior_color,vin,price_krw,price_rub,photos,details,last_seen_at,updated_at)
  SELECT id,slug,source,"sourceUrl",'active',country,"currencyCode",make,model,trim,year,"mileageKm","engineCc","powerHp",fuel,transmission,drive,"bodyType","exteriorColor","interiorColor",vin,"sourcePrice","priceRub",photos,details,now(),now() FROM incoming
  ON CONFLICT (id) DO UPDATE SET slug=EXCLUDED.slug,source_url=EXCLUDED.source_url,status='active',currency_code=EXCLUDED.currency_code,make=EXCLUDED.make,model=EXCLUDED.model,trim=EXCLUDED.trim,year=EXCLUDED.year,mileage_km=EXCLUDED.mileage_km,engine_cc=EXCLUDED.engine_cc,power_hp=EXCLUDED.power_hp,fuel=EXCLUDED.fuel,transmission=EXCLUDED.transmission,exterior_color=EXCLUDED.exterior_color,price_krw=EXCLUDED.price_krw,price_rub=EXCLUDED.price_rub,photos=EXCLUDED.photos,details=EXCLUDED.details,last_seen_at=now(),updated_at=now()`, [JSON.stringify(payload)]);
  return { received: cars.length, japan: cars.filter((car) => car.country === "jp").length, china: cars.filter((car) => car.country === "cn").length };
}
