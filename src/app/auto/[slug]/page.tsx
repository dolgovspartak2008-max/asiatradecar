import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatKrw, formatRub } from "@/domain/currency";
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
  const title = `${car.make} ${car.model} ${car.year}`; return { title, description: `${title}, пробег ${car.mileageKm.toLocaleString("ru-RU")} км. Доставка из Кореи в Россию.`, alternates: { canonical: `/auto/${car.slug}` }, openGraph: { title, images: car.photos[0] ? [car.photos[0]] : [] } };
}

export default async function CarPage({ params }: Props) {
  const car = await getCarBySlug((await params).slug); if (!car) notFound(); const name = `${car.make} ${car.model}${car.trim ? ` ${car.trim}` : ""}`;
  const specs = [["Год", car.year], ["Пробег", `${car.mileageKm.toLocaleString("ru-RU")} км`], ["Двигатель", car.engineCc ? `${(car.engineCc / 1000).toFixed(1)} л` : null], ["Мощность", car.powerHp ? `${car.powerHp} л.с.` : null], ["Топливо", car.fuel], ["Коробка", formatVehicleSpec("transmission", car.transmission)], ["Привод", formatVehicleSpec("drive", car.drive)], ["Кузов", formatVehicleSpec("body", car.bodyType)], ["Цвет", car.exteriorColor], ["Страховые случаи", readInsuranceHistory(car.details)]].filter((item) => item[1]);
  const encarUrl = car.country === "kr" && /^\d+$/.test(car.id) ? `https://www.encar.com/dc/dc_cardetailview.do?carid=${encodeURIComponent(car.id)}` : null;
  const schema = { "@context": "https://schema.org", "@type": "Vehicle", name, image: car.photos, vehicleModelDate: String(car.year), mileageFromOdometer: { "@type": "QuantitativeValue", value: car.mileageKm, unitCode: "KMT" }, offers: { "@type": "Offer", priceCurrency: car.priceRub ? "RUB" : "KRW", price: car.priceRub || car.priceKrw, url: `${site.url}/auto/${car.slug}`, availability: "https://schema.org/InStock" } };
  return <section className="page-section car-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}/>
    <div className="container"><div className="car-detail-grid">
      <div className="car-gallery-area">{car.photos.length ? <CarGallery photos={car.photos} name={name} /> : <div className="detail-placeholder"><Icon name="car" size={64}/><span>Фотографии обновляются из источника</span></div>}</div>
      <aside className="car-sidebar"><h1>{name}</h1>{encarUrl && <a className="encar-source-button" href={encarUrl} target="_blank" rel="noreferrer">Авто на Encar <Icon name="arrow" /></a>}<p className="source-car-price">{formatKrw(car.priceKrw)} в Корее</p><p className="detail-price">{car.priceRub ? formatRub(car.priceRub) : "Итоговая цена уточняется"}</p><p className="price-caption">Под ключ в РФ</p><div className="car-detail-actions"><PriceBreakdown slug={car.slug} carName={name} priceKrw={car.priceKrw} priceRub={car.priceRub} details={car.details} currencyCode={car.currencyCode} country={car.country} /><ApplicationDialog carName={name} /></div><div className="notice"><Icon name="shield"/><p>Страховая история и расчёт загружены из источника. Перед выкупом автомобиль и документы проверяются отдельно.</p></div></aside>
      <div className="car-specs"><h2>Характеристики</h2><dl>{specs.map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div>
      <CarOptions details={car.details} />
    </div></div>
  </section>;
}
