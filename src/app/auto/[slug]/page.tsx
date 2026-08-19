import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { formatKrw, formatRub } from "@/domain/currency";
import { getCarBySlug } from "@/server/catalog";
import { Icon } from "@/components/icons";
import { LeadForm } from "@/components/lead-form";
import { site } from "@/config/site";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const car = await getCarBySlug((await params).slug); if (!car) return { title: "Автомобиль не найден", robots: { index: false, follow: true } };
  const title = `${car.make} ${car.model} ${car.year}`; return { title, description: `${title}, пробег ${car.mileageKm.toLocaleString("ru-RU")} км. Доставка из Кореи в Россию.`, alternates: { canonical: `/auto/${car.slug}` }, openGraph: { title, images: car.photos[0] ? [car.photos[0]] : [] } };
}

export default async function CarPage({ params }: Props) {
  const car = await getCarBySlug((await params).slug); if (!car) notFound(); const name = `${car.make} ${car.model}${car.trim ? ` ${car.trim}` : ""}`;
  const specs = [["Год", car.year], ["Пробег", `${car.mileageKm.toLocaleString("ru-RU")} км`], ["Двигатель", car.engineCc ? `${(car.engineCc / 1000).toFixed(1)} л` : null], ["Мощность", car.powerHp ? `${car.powerHp} л.с.` : null], ["Топливо", car.fuel], ["Коробка", car.transmission], ["Привод", car.drive], ["Кузов", car.bodyType], ["Цвет", car.exteriorColor]].filter((item) => item[1]);
  const schema = { "@context": "https://schema.org", "@type": "Vehicle", name, image: car.photos, vehicleModelDate: String(car.year), mileageFromOdometer: { "@type": "QuantitativeValue", value: car.mileageKm, unitCode: "KMT" }, offers: { "@type": "Offer", priceCurrency: car.priceRub ? "RUB" : "KRW", price: car.priceRub || car.priceKrw, url: `${site.url}/auto/${car.slug}`, availability: "https://schema.org/InStock" } };
  return <section className="page-section car-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}/><div className="container"><div className="car-detail-grid"><div><div className="car-gallery">{car.photos.length ? car.photos.slice(0, 5).map((photo, index) => <div className={index === 0 ? "main-photo" : ""} key={photo}><Image src={photo} alt={`${name}, фото ${index + 1}`} fill sizes={index === 0 ? "(max-width: 900px) 100vw, 60vw" : "30vw"} loading={index === 0 ? "eager" : "lazy"} unoptimized /></div>) : <div className="detail-placeholder"><Icon name="car" size={64}/><span>Фотографии обновляются из источника</span></div>}</div><div className="car-specs"><h2>Характеристики</h2><dl>{specs.map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div></div><aside className="car-sidebar"><p className="eyebrow">В наличии у источника</p><h1>{name}</h1><p className="detail-price">{car.priceRub ? formatRub(car.priceRub) : formatKrw(car.priceKrw)}</p>{car.priceRub && <p>{formatKrw(car.priceKrw)} — цена автомобиля без итоговых расходов</p>}<div className="notice"><Icon name="shield"/><p>Перед выкупом автомобиль и документы проходят отдельную проверку. Итоговая стоимость фиксируется после расчёта.</p></div><LeadForm formId="car-detail" compact carName={name}/></aside></div></div></section>;
}
