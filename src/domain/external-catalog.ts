import { load } from "cheerio";

export type ExternalCatalogCar = {
  id: string;
  slug: string;
  status: "active" | "inactive";
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

export function getBanzaiCursorWindow(totalPages: number, nextPage: number) {
  const total = Math.max(0, Math.floor(totalPages));
  const requested = Math.max(1, Math.floor(nextPage));
  const start = requested > total ? 1 : requested;
  const end = Math.min(total, start + Math.ceil(total / 24) - 1);
  const completed = total > 0 && end >= total;
  return { start, end, nextPage: completed ? 1 : end + 1, completed };
}

export function parseBanzaiApiPage(payload: unknown) {
  if (!payload || typeof payload !== "object") return { cars: [] as ExternalCatalogCar[], total: 0, totalPages: 0 };
  const record = payload as { items?: unknown; pagination?: unknown };
  const pagination = record.pagination && typeof record.pagination === "object" ? record.pagination as Record<string, unknown> : {};
  const items = Array.isArray(record.items) ? record.items : [];
  const cars = items.flatMap((value): ExternalCatalogCar[] => {
    if (!value || typeof value !== "object") return [];
    const item = value as Record<string, unknown>;
    const car = item.car && typeof item.car === "object" ? item.car as Record<string, unknown> : {};
    const characteristics = item.characteristics && typeof item.characteristics === "object" ? item.characteristics as Record<string, unknown> : {};
    const lot = item.lot && typeof item.lot === "object" ? item.lot as Record<string, unknown> : {};
    const auction = lot.auction && typeof lot.auction === "object" ? lot.auction as Record<string, unknown> : {};
    const status = item.status && typeof item.status === "object" ? item.status as Record<string, unknown> : {};
    const id = String(item.id || "").trim();
    const make = String(car.mark || "").trim();
    const model = String(car.model || "").trim();
    if (!id || !make || !model) return [];
    const engineLiters = Number(String(characteristics.engineCapacity || "").replace(",", "."));
    const engineText = String(characteristics.engine || "");
    const photos = (Array.isArray(item.images) ? item.images : []).flatMap((image): string[] => {
      if (typeof image === "string") return image.startsWith("https://") ? [image] : [];
      if (!image || typeof image !== "object") return [];
      const url = String((image as Record<string, unknown>).url || (image as Record<string, unknown>).src || "");
      return url.startsWith("https://") ? [url] : [];
    });
    const tags = (Array.isArray(item.tags) ? item.tags : []).flatMap((tag): string[] => tag && typeof tag === "object" ? [String((tag as Record<string, unknown>).title || "").trim()].filter(Boolean) : []);
    const year = Number(item.registrationYear) || numberFrom(String(car.year || characteristics.year || "").match(/(?:19|20)\d{2}/)?.[0]);
    const sourcePrice = numberFrom(String(item.onePrice || "")) || numberFrom(String(item.endPrice || "")) || numberFrom(String(item.startPrice || ""));
    const statusName = String(status.name || "").trim();
    const active = !/(продан|продано|закрыт|снят|sold|closed)/i.test(statusName);
    const lotItems = [String(auction.name || "").trim() && `Аукцион: ${String(auction.name).trim()}`, String(lot.number || "").trim() && `Лот: ${String(lot.number).trim()}`, String(item.grade || "").trim() && `Оценка: ${String(item.grade).trim()}`, statusName && `Статус: ${statusName}`, ...tags].filter((entry): entry is string => Boolean(entry));
    return [{
      id: `banzai-${id}`, slug: `jp-${slugPart(make)}-${slugPart(model)}-${id}`, status: active ? "active" : "inactive", source: "banzai24",
      sourceUrl: `https://banzai24.com/car/JP/${encodeURIComponent(id)}`, country: "jp", currencyCode: "JPY", make, model,
      trim: String(characteristics.modification || "").trim() || null, year, mileageKm: Number(characteristics.mileage) || 0,
      engineCc: Number.isFinite(engineLiters) && engineLiters > 0 ? Math.round(engineLiters * 1000) : null,
      powerHp: numberFrom(engineText.match(/([\d\s]+)\s*л\.с\./i)?.[1]) || null,
      fuel: String(characteristics.fuelType || "").trim() || null,
      transmission: String(characteristics.transmission || "").trim() || null,
      drive: String(characteristics.drivetrain || "").trim() || null,
      bodyType: String(characteristics.bodyType || "").trim() || null,
      exteriorColor: String(characteristics.color || "").trim() || null,
      interiorColor: String(characteristics.interiorColor || "").trim() || null,
      vin: String(characteristics.bodyNumber || "").trim() || null,
      sourcePrice, photos: [...new Set(photos)], details: {
        auction: String(auction.name || "").trim(), lot: String(lot.number || "").trim(),
        tradeDate: String(lot.tradeDate || "").trim(), tradeTime: String(lot.tradeTime || "").trim(),
        grade: String(item.grade || "").trim(), status: statusName, tags, source: "Banzai24",
        optionGroups: lotItems.length ? [{ title: "Данные лота", items: lotItems }] : []
      }
    }];
  });
  return { cars, total: Number(pagination.total) || cars.length, totalPages: Number(pagination.totalPages) || 0 };
}

const chineseBrands: Record<string, string> = {
  "大众": "Volkswagen", "红旗": "Hongqi", "丰田": "Toyota", "宝马": "BMW", "比亚迪": "BYD", "路虎": "Land Rover", "雷克萨斯": "Lexus",
  "奔驰": "Mercedes-Benz", "奥迪": "Audi", "本田": "Honda", "日产": "Nissan", "现代": "Hyundai", "起亚": "Kia", "沃尔沃": "Volvo",
  "特斯拉": "Tesla", "保时捷": "Porsche", "凯迪拉克": "Cadillac", "别克": "Buick", "福特": "Ford", "雪佛兰": "Chevrolet",
  "马自达": "Mazda", "三菱": "Mitsubishi", "斯巴鲁": "Subaru", "铃木": "Suzuki", "吉利": "Geely", "长安": "Changan",
  "奇瑞": "Chery", "长城": "Great Wall", "哈弗": "Haval", "理想": "Li Auto", "蔚来": "NIO", "小鹏": "XPeng", "小米": "Xiaomi",
  "零跑": "Leapmotor", "五菱": "Wuling", "广汽传祺": "GAC Trumpchi", "领克": "Lynk & Co", "极氪": "Zeekr", "问界": "AITO"
};
const chineseModels: Record<string, string> = {
  "红旗HS5": "HS5", "凯美瑞": "Camry", "宝马M3": "M3", "红旗HS3 PHEV": "HS3 PHEV",
  "秦MAX DM": "Qin MAX DM", "秦MAX EV": "Qin MAX EV", "揽胜": "Range Rover",
  "海豹06DM": "Seal 06 DM", "海豹06EV": "Seal 06 EV", "雷克萨斯LX": "LX", "雷克萨斯GX": "GX", "红旗天工08": "Tiangong 08",
  "星愿": "Xingyuan", "宝马3系": "3 Series", "奔驰E级": "E-Class", "奔驰C级": "C-Class", "奥迪A6L": "A6L", "小米SU7": "SU7", "小米YU7": "YU7",
  "帕萨特": "Passat", "朗逸": "Lavida", "速腾": "Sagitar", "凯迪拉克CT5": "CT5", "亚洲龙": "Avalon", "零跑A10": "A10", "零跑C10": "C10",
  "理想i6": "i6", "小鹏MONA M03": "MONA M03", "星瑞": "Preface", "元UP": "Yuan UP", "宋Pro DM": "Song Pro DM", "宝马5系": "5 Series"
};

export function translateChineseCarName(make: string, model: string) {
  return { make: chineseBrands[make] || make, model: chineseModels[model] || model };
}

const modelMakes: Record<string, string> = { "凯美瑞": "Toyota", "亚洲龙": "Toyota", "RAV4荣放": "Toyota", "帕萨特": "Volkswagen", "朗逸": "Volkswagen", "速腾": "Volkswagen" };
const chineseBrandIds: Record<string, string> = { "1": "Volkswagen", "2": "Audi", "3": "Mercedes-Benz", "4": "BMW", "5": "Toyota", "16": "BYD", "30": "Cadillac", "34": "MG", "73": "Geely", "195": "XPeng", "202": "Li Auto", "207": "Leapmotor", "535": "Xiaomi", "858": "Geely Galaxy" };

function readableSeriesName(original: string, id: string) {
  if (chineseModels[original]) return chineseModels[original];
  const withoutBrand = Object.keys(chineseBrands).sort((a, b) => b.length - a.length).reduce((name, brand) => name.replace(brand, ""), original).trim();
  const latin = withoutBrand.replace(/[\u3400-\u9fff]/g, " ").replace(/\s+/g, " ").trim();
  return latin || `Model ${id}`;
}

function dongchediSeriesCar(value: unknown): ExternalCatalogCar[] {
  if (!value || typeof value !== "object") return [];
  const item = value as Record<string, unknown>;
  const id = String(item.concern_id || item.id || "");
  const originalName = String(item.outter_name || "").trim();
  const priceWan = Number(item.dealer_min_price || item.min_price || 0);
  if (!id || !originalName) return [];
  const brandEntry = Object.entries(chineseBrands).sort(([a], [b]) => b.length - a.length).find(([name]) => originalName.includes(name));
  const make = modelMakes[originalName] || brandEntry?.[1] || chineseBrandIds[String(item.brand_id || "")] || "China Auto";
  const model = readableSeriesName(originalName, id);
  const cover = String(item.cover_url || "").replace(/^http:/, "https:");
  const count = Number(item.count) || (Array.isArray(item.car_ids) ? item.car_ids.length : 0);
  const priceRange = String(item.dealer_price || item.min_price || "");
  const modelItems = [count ? `Доступно комплектаций: ${count}` : "", priceRange ? `Диапазон цен: ${priceRange}` : ""].filter(Boolean);
  const sourceStatus = String(item.series_status_tag || "");
  return [{
    id: `dongchedi-${id}`, slug: `cn-${slugPart(make)}-${slugPart(model)}-${id}`, status: /停售|下架|停产/.test(sourceStatus) ? "inactive" : "active", source: "dongchedi",
    sourceUrl: `https://www.dongchedi.com/auto/series/${id}`, country: "cn", currencyCode: "CNY", make, model, trim: null,
    year: 0, mileageKm: 0, engineCc: null, powerHp: null, fuel: null, transmission: null, drive: null,
    bodyType: null, exteriorColor: null, interiorColor: null, vin: null, sourcePrice: Number.isFinite(priceWan) && priceWan > 0 ? Math.round(priceWan * 10_000) : 0,
    photos: cover.startsWith("https://") ? [cover] : [], details: { originalName, priceRange, source: "Dongchedi", carIds: Array.isArray(item.car_ids) ? item.car_ids : [], optionGroups: modelItems.length ? [{ title: "Данные модели", items: modelItems }] : [] }
  }];
}

export function parseDongchediSeriesPage(payload: unknown) {
  if (!payload || typeof payload !== "object") return { cars: [] as ExternalCatalogCar[], total: 0 };
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") return { cars: [] as ExternalCatalogCar[], total: 0 };
  const record = data as { series?: unknown; series_count?: unknown };
  const cars = Array.isArray(record.series) ? record.series.flatMap(dongchediSeriesCar) : [];
  return { cars, total: Number(record.series_count) || cars.length };
}

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
    const translated = translateChineseCarName(String(item.brand_name || "").trim(), String(item.series_name || "").trim());
    const { make, model } = translated;
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

export function parseBanzaiVehiclePage(html: string, sourceId: string): ExternalCatalogCar | null {
  const $ = load(html);
  const title = $("h1").first().text().replace(/\s+/g, " ").trim();
  const [name, ...trimParts] = title.split(",").map((part) => part.trim());
  const [make, ...modelParts] = (name || "").split(/\s+/);
  const model = modelParts.join(" ");
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const engine = text.match(/(?:Двигатель|Engine)\s*:\s*([\d.,]+)\s*(?:л|l)\s*(?:\/\s*([^/]+?))?(?:\s*\/\s*([\d\s]+)\s*(?:л\.с\.|hp))?/i);
  const price = numberFrom(text.match(/(?:Конечная цена|Final price)\s*:\s*([\d\s]+)\s*[¥￥]/i)?.[1])
    || numberFrom(text.match(/(?:Стартовая цена|Start price)\s*:\s*([\d\s]+)\s*[¥￥]/i)?.[1]);
  if (!sourceId || !make || !model || !price) return null;
  const engineLiters = Number(engine?.[1]?.replace(",", "."));
  const photos = $("img[src]").toArray().map((image) => $(image).attr("src") || "").filter((url) => url.startsWith("https://banzai24.com/api/image-service/"));
  return {
    id: `banzai-${sourceId}`, slug: `jp-${slugPart(make)}-${slugPart(model)}-${sourceId}`, status: "active", source: "banzai24",
    sourceUrl: `https://banzai24.com/car/JP/${encodeURIComponent(sourceId)}`, country: "jp", currencyCode: "JPY", make, model,
    trim: trimParts.join(", ") || null, year: numberFrom(text.match(/(?:Год|Year)\s*:\s*((?:19|20)\d{2})/i)?.[1]),
    mileageKm: numberFrom(text.match(/(?:Пробег|Mileage)\s*:\s*([\d\s]+)\s*(?:км|km)/i)?.[1]),
    engineCc: Number.isFinite(engineLiters) && engineLiters > 0 ? Math.round(engineLiters * 1000) : null,
    powerHp: numberFrom(engine?.[3]) || numberFrom(text.match(/(?:Двигатель|Engine)\s*:[^:]*?([\d\s]+)\s*(?:л\.с\.|hp)/i)?.[1]) || null, fuel: engine?.[2]?.trim() || null,
    transmission: text.match(/(?:Коробка|Gearbox)\s*:\s*(.+?)\s*(?:Цвет|Color)\s*:/i)?.[1]?.trim() || null,
    drive: text.match(/(?:Привод|Drive)\s*:\s*(.+?)\s*(?:Время торгов|Bidding time|Стартовая цена|Start price)\s*:/i)?.[1]?.trim() || null,
    bodyType: null, exteriorColor: text.match(/(?:Цвет|Color)\s*:\s*(.+?)\s*(?:Двигатель|Engine)\s*:/i)?.[1]?.trim() || null,
    interiorColor: null, vin: text.match(/(?:Номер кузова\/VIN|Body number\/VIN)\s*:\s*([^\s]+)/i)?.[1] || null,
    sourcePrice: price, photos: [...new Set(photos)], details: { source: "Banzai24" }
  };
}
