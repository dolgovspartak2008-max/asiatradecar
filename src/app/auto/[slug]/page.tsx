import type { Metadata } from "next";
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

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const car = await getCarBySlug((await params).slug); if (!car) return { title: "Автомобиль не найден", robots: { index: false, follow: true } };
  const title = `${car.make} ${car.model}${car.year > 0 ? ` ${car.year}` : ""}`; const mileage = car.mileageKm > 0 ? `, пробег ${car.mileageKm.toLocaleString("ru-RU")} км` : ""; return { title, description: `${title}${mileage}. Доставка в Россию.`, alternates: { canonical: `/auto/${car.slug}` }, openGraph: { title, images: car.photos[0] ? [car.photos[0]] : [] } };
}

export default async function CarPage({ params }: Props) {
  const car = await getCarBySlug((await params).slug); if (!car) notFound(); const name = `${car.make} ${car.model}${car.trim ? ` ${car.trim}` : ""}`;
  const specs = [["Год", car.year > 0 ? car.year : null], ["Пробег", car.mileageKm > 0 ? `${car.mileageKm.toLocaleString("ru-RU")} км` : null], ["Двигатель", car.engineCc ? `${(car.engineCc / 1000).toFixed(1)} л` : null], ["Мощность", car.powerHp ? `${car.powerHp} л.с.` : null], ["Топливо", car.fuel], ["Коробка", formatVehicleSpec("transmission", car.transmission)], ["Привод", formatVehicleSpec("drive", car.drive)], ["Кузов", formatVehicleSpec("body", car.bodyType)], ["Цвет", car.exteriorColor], ["Страховые случаи", car.country === "kr" ? readInsuranceHistory(car.details) : null]].filter((item) => item[1]);
  const encarUrl = car.country === "kr" && /^\d+$/.test(car.id) ? `https://www.encar.com/dc/dc_cardetailview.do?carid=${encodeURIComponent(car.id)}` : null;
  const sourceLink = encarUrl ? { href: encarUrl, label: "Авто на Encar" } : car.sourceUrl ? { href: car.sourceUrl, label: car.country === "jp" ? "Авто на Banzai24" : car.country === "cn" ? "Авто на Dongchedi" : "Открыть источник" } : null;
  const schema = { "@context": "https://schema.org", "@type": "Vehicle", name, image: car.photos, ...(car.year > 0 ? { vehicleModelDate: String(car.year) } : {}), ...(car.mileageKm > 0 ? { mileageFromOdometer: { "@type": "QuantitativeValue", value: car.mileageKm, unitCode: "KMT" } } : {}), offers: { "@type": "Offer", priceCurrency: car.priceRub ? "RUB" : car.currencyCode, price: car.priceRub || car.priceKrw, url: `${site.url}/auto/${car.slug}`, availability: "https://schema.org/InStock" } };
  return <section className="page-section car-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}/>
    <div className="container"><div className="car-detail-grid">
      <div className="car-detail-title"><h1>{name}</h1></div>
      <div className="car-gallery-area">{car.photos.length ? <CarGallery photos={car.photos} name={name} /> : <div className="detail-placeholder"><Icon name="car" size={64}/><span>Фотографии обновляются из источника</span></div>}</div>
      <aside className="car-sidebar">{sourceLink && <a className="source-car-button" href={sourceLink.href} target="_blank" rel="noreferrer">{sourceLink.label} <Icon name="arrow" /></a>}<p className="detail-price">{car.priceRub ? formatRub(car.priceRub) : "Цена уточняется"}</p><p className="price-caption">Под ключ в РФ</p><div className="car-detail-actions"><PriceBreakdown slug={car.slug} carName={name} priceKrw={car.priceKrw} priceRub={car.priceRub} details={car.details} currencyCode={car.currencyCode} country={car.country} /><ApplicationDialog carName={name} /></div><div className="notice"><Icon name="shield"/><p>История и расчёт загружены из источника. Перед выкупом автомобиль и документы проверяются отдельно.</p></div></aside>
      <div className="car-specs"><h2>Характеристики</h2><dl>{specs.map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div>
      <CarOptions details={car.details} />
    </div></div>
  </section>;
}
