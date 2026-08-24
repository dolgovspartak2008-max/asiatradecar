export function resolveSiteUrl(env: Record<string, string | undefined> = process.env) {
  if (env.SITE_URL) return env.SITE_URL;
  const vercelUrl = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  return vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000";
}

export function isSiteIndexable(env: Record<string, string | undefined> = process.env) {
  if (env.SITE_INDEXING_DISABLED?.toLowerCase() === "true") return false;
  const publicUrl = env.SITE_URL || env.VERCEL_PROJECT_PRODUCTION_URL || (env.VERCEL_ENV === "production" ? env.VERCEL_URL : undefined);
  if (!publicUrl) return false;
  try {
    const url = new URL(publicUrl.startsWith("http") ? publicUrl : `https://${publicUrl}`);
    return url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

export const site = {
  name: "ASIA TRADE CAR",
  description: "Подбор и доставка автомобилей из зарубежных стран. Полное сопровождение сделки. Низкие цены.",
  url: resolveSiteUrl(),
  owner: process.env.SITE_OWNER_NAME || "ИП Охтий Олеся Сергеевна",
  inn: process.env.SITE_OWNER_INN || "220419337642",
  ogrn: process.env.SITE_OWNER_OGRN || "326220200067030",
  address: process.env.SITE_OWNER_ADDRESS || "659335, Алтайский край, г. Бийск, ул. Мухачева, 226-73",
  email: process.env.SITE_OWNER_EMAIL || "",
  phone: process.env.SITE_OWNER_PHONE || "",
  telegram: process.env.NEXT_PUBLIC_TELEGRAM_URL || "https://t.me/AsiaTradeCar",
  youtube: "https://youtube.com/@asiatradecar",
  vk: "https://vk.ru/asiatradecar",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_URL || "",
  policyVersion: process.env.PD_POLICY_VERSION || "2026-08-22",
  registrationDate: "03.06.2026",
  registrationAuthority: "Межрайонная инспекция Федеральной налоговой службы № 16 по Алтайскому краю",
  bank: "Филиал «Новосибирский» АО «Альфа-Банк»",
  settlementAccount: "40802810123620005262",
  correspondentAccount: "30101810600000000774",
  bic: "045004774",
  okved: "45.11, 45.11.1, 45.11.3, 47.99, 47.99.2"
};

export const operatorReady = Boolean(site.owner && site.inn && site.ogrn && site.address);
export const retentionDays = Number(process.env.PD_RETENTION_DAYS);
export const retentionReady = Number.isInteger(retentionDays) && retentionDays > 0;
export const siteIndexable = isSiteIndexable();
