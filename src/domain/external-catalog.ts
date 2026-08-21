import { load } from "cheerio";

export type ExternalCatalogCar = {
  id: string;
  slug: string;
  status: "active";
  source: "banzai24" | "dongchedi";
  sourceUrl: string;
  country: "jp" | "cn";
  currencyCode: "JPY" | "CNY";
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
  sourcePrice: number;
  photos: string[];
  details: Record<string, unknown>;
};

const numberFrom = (value?: string | null) => Number((value || "").replace(/[^\d]/g, "")) || 0;
const slugPart = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9а-яё]+/gi, "-").replace(/^-|-$/g, "");

export function parseDongchediCatalog(html: string): ExternalCatalogCar[] {
  const $ = load(html);
  const raw = $("#__NEXT_DATA__").text();
  if (!raw) return [];
  let items: unknown;
  try { items = (JSON.parse(raw) as { props?: { pageProps?: { newCarData?: unknown } } }).props?.pageProps?.newCarData; } catch { return []; }
  if (!Array.isArray(items)) return [];
  return items.flatMap((value): ExternalCatalogCar[] => {
    if (!value || typeof value !== "object") return [];
    const item = value as Record<string, unknown>;
    const id = String(item.series_id || "");
    const make = String(item.brand_name || "").trim();
    const model = String(item.series_name || "").trim();
    const priceInfo = item.price_info && typeof item.price_info === "object" ? item.price_info as Record<string, unknown> : {};
    const priceWan = Number(String(priceInfo.price || "").split("-")[0]);
    if (!id || !make || !model || !Number.isFinite(priceWan) || priceWan <= 0) return [];
    const cover = String(item.cover_url || "").replace(/^http:/, "https:");
    return [{
      id: `dongchedi-${id}`, slug: `cn-${slugPart(make)}-${slugPart(model)}-${id}`, status: "active", source: "dongchedi",
      sourceUrl: `https://www.dongchedi.com/auto/series/${id}`, country: "cn", currencyCode: "CNY", make, model, trim: null,
      year: item.online_date_unix ? new Date(Number(item.online_date_unix) * 1000).getUTCFullYear() : new Date().getUTCFullYear(),
      mileageKm: 0, engineCc: null, powerHp: null, fuel: null, transmission: null, drive: null, bodyType: null,
      exteriorColor: null, interiorColor: null, vin: null, sourcePrice: Math.round(priceWan * 10_000),
      photos: cover.startsWith("https://") ? [cover] : [], details: { priceRange: String(priceInfo.price || ""), priceUnit: String(priceInfo.unit_text || "万") }
    }];
  });
}

export function parseBanzaiCatalog(html: string) {
  const $ = load(html);
  const cars = $(".card.card_shadow").toArray().flatMap((element): ExternalCatalogCar[] => {
    const card = $(element);
    const href = card.find('a[href*="/car/JP/"]').first().attr("href") || "";
    const sourceId = href.match(/\/car\/JP\/([^/?#]+)/)?.[1] || "";
    const title = card.find(".card__title .text-semibold, .card__info-link .text-semibold").first().text().replace(/\s+/g, " ").trim();
    const [name, ...trimParts] = title.split(",").map((part) => part.trim());
    const [make, ...modelParts] = (name || "").split(/\s+/);
    const model = modelParts.join(" ");
    const text = card.text().replace(/\s+/g, " ").trim();
    const priceText = text.match(/Конечная цена:\s*([\d\s]+)\s*¥/i)?.[1]
      || text.match(/Последняя ставка:\s*([\d\s]+)\s*¥/i)?.[1]
      || text.match(/Старт от:\s*([\d\s]+)\s*¥/i)?.[1];
    const sourcePrice = numberFrom(priceText);
    if (!sourceId || !make || !model || !sourcePrice) return [];
    const engineLiters = Number(text.match(/Двигатель\s*:\s*([\d.,]+)\s*л/i)?.[1]?.replace(",", "."));
    const photos = card.find("img[src]").toArray().map((image) => $(image).attr("src") || "").filter((url) => url.startsWith("https://banzai24.com/api/image-service/"));
    return [{
      id: `banzai-${sourceId}`, slug: `jp-${slugPart(make)}-${slugPart(model)}-${sourceId}`, status: "active", source: "banzai24",
      sourceUrl: new URL(href, "https://banzai24.com").href, country: "jp", currencyCode: "JPY", make, model,
      trim: trimParts.join(", ") || null, year: numberFrom(text.match(/Год\s*:\s*((?:19|20)\d{2})/i)?.[1]),
      mileageKm: numberFrom(text.match(/Пробег\s*:\s*([\d\s]+)\s*км/i)?.[1]),
      engineCc: Number.isFinite(engineLiters) ? Math.round(engineLiters * 1000) : null,
      powerHp: numberFrom(text.match(/([\d\s]+)\s*л\.с\./i)?.[1]) || null,
      fuel: null, transmission: text.match(/Коробка\s*:\s*([^:]+?)(?:Цвет|Двигатель|Старт)/i)?.[1]?.trim() || null,
      drive: null, bodyType: null, exteriorColor: text.match(/Цвет\s*:\s*([^:]+?)(?:Двигатель|Старт)/i)?.[1]?.trim() || null,
      interiorColor: null, vin: null, sourcePrice, photos: [...new Set(photos)],
      details: { lot: card.find(".card__lot-info").first().text().replace(/\s+/g, " ").trim() }
    }];
  });
  const total = numberFrom($("body").text().match(/Показать\s+([\d\s]+)\s+лот/i)?.[1]) || cars.length;
  return { cars, total };
}
