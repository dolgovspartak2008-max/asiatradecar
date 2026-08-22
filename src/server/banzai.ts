import { createCipheriv, randomBytes, randomUUID } from "node:crypto";
import { parseBanzaiApiPage, parseBanzaiVehiclePage } from "@/domain/external-catalog";

const DEFAULT_TRACE_KEY = "Q0RFRkdISUpLTE1OT1BRUlNUVVZXWFla";
const BROWSER_HEADERS = { "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36" };
let sessionCookie: string | undefined;

async function getSessionCookie(force = false) {
  if (sessionCookie && !force) return sessionCookie;
  const response = await fetch("https://banzai24.com/", { cache: "no-store", signal: AbortSignal.timeout(10_000), headers: BROWSER_HEADERS });
  if (!response.ok) throw new Error(`Banzai24 вернул ${response.status} при создании сессии`);
  const values = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() || [response.headers.get("set-cookie") || ""];
  sessionCookie = values.flatMap((value) => value.split(/,(?=\s*[^;,=]+=[^;,]+)/)).map((value) => value.trim().split(";")[0]).filter(Boolean).join("; ");
  if (!sessionCookie) throw new Error("Banzai24 не создал cookie-сессию");
  return sessionCookie;
}

function createTraceHeader() {
  const key = Buffer.from(process.env.BANZAI_API_TRACE_KEY || DEFAULT_TRACE_KEY, "utf8");
  if (key.length !== 32) throw new Error("BANZAI_API_TRACE_KEY должен содержать 32 байта");
  const id = randomUUID();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(id, "utf8"), cipher.final()]);
  return `${id}:${iv.toString("base64")}:${encrypted.toString("base64")}`;
}

export async function fetchBanzaiPage(page: number, perPage = 100) {
  const url = new URL("https://banzai24.com/api/catalog-service/lots");
  url.searchParams.set("source", "auctions");
  url.searchParams.set("page", String(page));
  url.searchParams.set("perPage", String(perPage));
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
        headers: { Accept: "application/json", ...BROWSER_HEADERS, Cookie: await getSessionCookie(attempt > 0), Origin: "https://banzai24.com", Referer: "https://banzai24.com/", "x-ym-trace": createTraceHeader() }
      });
    } catch (error) {
      if (attempt === 0) { await new Promise((resolve) => setTimeout(resolve, 1_000)); continue; }
      throw error;
    }
    if ((response.status === 429 || response.status >= 500) && attempt === 0) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(2_000, retryAfter * 1000) : 1_000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    if (!response.ok) throw new Error(`Banzai24 API вернул ${response.status} для страницы ${page}`);
    const parsed = parseBanzaiApiPage(await response.json());
    if (!parsed.cars.length) throw new Error(`Banzai24 API вернул пустую страницу ${page}`);
    if (parsed.totalPages < 1) throw new Error("Banzai24 API не передал количество страниц");
    return parsed;
  }
  throw new Error(`Banzai24 API не ответил для страницы ${page}`);
}

export async function fetchBanzaiVehicle(id: string) {
  const response = await fetch(`https://banzai24.com/car/JP/${encodeURIComponent(id)}`, {
    next: { revalidate: 300 }, signal: AbortSignal.timeout(10_000),
    headers: { ...BROWSER_HEADERS, Cookie: await getSessionCookie(), Referer: "https://banzai24.com/" }
  });
  if (!response.ok) throw new Error(`Banzai24 вернул ${response.status} для автомобиля`);
  return parseBanzaiVehiclePage(await response.text(), id);
}
