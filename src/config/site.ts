export const site = {
  name: "ASIA TRADE CAR",
  description: "Подбор, проверка, выкуп и доставка автомобилей из Азии в Россию.",
  url: process.env.SITE_URL || "http://localhost:3000",
  owner: process.env.SITE_OWNER_NAME || "",
  inn: process.env.SITE_OWNER_INN || "",
  ogrn: process.env.SITE_OWNER_OGRN || "",
  address: process.env.SITE_OWNER_ADDRESS || "",
  email: process.env.SITE_OWNER_EMAIL || "",
  phone: process.env.SITE_OWNER_PHONE || "",
  telegram: process.env.NEXT_PUBLIC_TELEGRAM_URL || "https://t.me/AsiaTradeCar",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_URL || "",
  policyVersion: process.env.PD_POLICY_VERSION || "2026-08-19"
};

export const operatorReady = Boolean(site.owner && site.inn && site.address && site.email);
export const retentionDays = Number(process.env.PD_RETENTION_DAYS);
export const retentionReady = Number.isInteger(retentionDays) && retentionDays > 0;
export const isPublicSiteUrl = (() => {
  try { const url = new URL(site.url); return url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname); } catch { return false; }
})();
export const launchReady = operatorReady && retentionReady && isPublicSiteUrl;
