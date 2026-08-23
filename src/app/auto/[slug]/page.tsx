import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatRub } from "@/domain/currency";
import { formatVehicleSpec, readInsuranceHistory } from "@/domain/car-details";
import { getCarBySlug } from "@/server/catalog";
import { Icon } from "@/components/icons";
import { CarGallery } from "@/components/car-gallery";
import { PriceBreakdown } from "@/components/price-breakdown";
import { ApplicationDialog } from "@/components/application-dialog";
import { CarOptions } from "@/components/car-options";
import { site } from "@/config/site";
import { buildVehicleSchema, catalogMarkets } from "@/domain/seo";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const car = await getCarBySlug((await params).slug); if (!car) return { title: "Автомобиль не найден", robots: { index: false, follow: true } };
  const title = `${car.make} ${car.model}${car.trim ? ` ${car.trim}` : ""}${car.year > 0 ? ` ${car.year}` : ""}`; const mileage = car.mileageKm > 0 ? `, пробег ${car.mileageKm.toLocaleString("ru-RU")} км` : ""; const description = `${title}${mileage}. Характеристики, проверка и расчёт доставки в Россию.`; return { title, description, alternates: { canonical: `/auto/${car.slug}` }, openGraph: { type: "website", title, description, url: `/auto/${car.slug}`, images: car.photos[0] ? [car.photos[0]] : [] }, twitter: { card: "summary_large_image", title, description, images: car.photos[0] ? [car.photos[0]] : [] } };
}

export default async function CarPage({ params }: Props) {
  const car = await getCarBySlug((await params).slug); if (!car) notFound(); const name = `${car.make} ${car.model}${car.trim ? ` ${car.trim}` : ""}`;
  const specs = [["Год", car.year > 0 ? car.year : null], ["Пробег", car.mileageKm > 0 ? `${car.mileageKm.toLocaleString("ru-RU")} км` : null], ["Двигатель", car.engineCc ? `${(car.engineCc / 1000).toFixed(1)} л` : null], ["Мощность", car.powerHp ? `${car.powerHp} л.с.` : null], ["Топливо", car.fuel], ["Коробка", formatVehicleSpec("transmission", car.transmission)], ["Привод", formatVehicleSpec("drive", car.drive)], ["Кузов", formatVehicleSpec("body", car.bodyType)], ["Цвет", car.exteriorColor], ["Страховые случаи", car.country === "kr" ? readInsuranceHistory(car.details) : null]].filter((item) => item[1]);
  const encarUrl = car.country === "kr" && /^\d+$/.test(car.id) ? `https://www.encar.com/dc/dc_cardetailview.do?carid=${encodeURIComponent(car.id)}` : null;
  const sourceLink = encarUrl ? { href: encarUrl, label: "Авто на Encar" } : car.sourceUrl ? { href: car.sourceUrl, label: car.country === "jp" ? "Авто на Banzai24" : car.country === "cn" ? "Авто на Dongchedi" : "Открыть источник" } : null;
  const schema = buildVehicleSchema(car, site.url);
  const market = catalogMarkets.find((item) => item.country === car.country) || catalogMarkets[0];
  return <section className="page-section car-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}/>
    <div className="container"><nav className="breadcrumbs" aria-label="Хлебные крошки"><Link href="/">Главная</Link><span aria-hidden="true">/</span><Link href={`/catalog/${market.slug}`}>{market.name}</Link><span aria-hidden="true">/</span><span>{name}</span></nav><div className="car-detail-grid">
      <div className="car-detail-title"><h1>{name}</h1></div>
      <div className="car-gallery-area">{car.photos.length ? <CarGallery photos={car.photos} name={name} /> : <div className="detail-placeholder"><Icon name="car" size={64}/><span>Фотографии обновляются из источника</span></div>}</div>
      <aside className="car-sidebar">{sourceLink && <a className="source-car-button" href={sourceLink.href} target="_blank" rel="noreferrer">{sourceLink.label} <Icon name="arrow" /></a>}<p className="detail-price">{car.priceRub ? formatRub(car.priceRub) : "Цена уточняется"}</p><p className="price-caption">Под ключ в РФ</p><div className="car-detail-actions"><PriceBreakdown slug={car.slug} carName={name} priceKrw={car.priceKrw} priceRub={car.priceRub} details={car.details} currencyCode={car.currencyCode} country={car.country} /><ApplicationDialog carName={name} /></div><div className="notice"><Icon name="shield"/><p>История и расчёт загружены из источника. Перед выкупом автомобиль и документы проверяются отдельно.</p></div></aside>
      <div className="car-specs"><h2>Характеристики</h2><dl>{specs.map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div>
      <CarOptions details={car.details} />
      <div className="car-seo-copy"><h2>Проверка, расчёт и оформление</h2><p>До выкупа команда отдельно проверяет историю, документы, состояние кузова и доступные технические данные автомобиля. Результаты проверки и выявленные риски согласуются с клиентом.</p><p>Стоимость на странице предварительная. Итоговые расходы, маршрут, сроки доставки, таможенное оформление и комплект документов фиксируются для выбранного автомобиля в договоре.</p><Link href={`/catalog/${market.slug}?make=${encodeURIComponent(car.make)}`}>Другие автомобили {car.make} из региона «{market.name}»</Link></div>
    </div></div>
  </section>;
}
