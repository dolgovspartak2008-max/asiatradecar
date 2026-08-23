import type { Metadata } from "next";
import { managers } from "@/components/footer";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "О компании и команде",
  description: "ASIA TRADE CAR: юридическая информация, команда сопровождения и порядок проверки автомобилей перед выкупом.",
  alternates: { canonical: "/about" },
  openGraph: { title: "О компании ASIA TRADE CAR", description: "Команда, реквизиты и порядок проверки автомобилей перед выкупом.", url: "/about", images: ["/media/hero-import.webp"] }
};

export default function AboutPage() {
  return <section className="page-section about-page"><article className="container content-sheet"><p className="eyebrow">ASIA TRADE CAR</p><h1>О компании и команде</h1><p>{site.owner} сопровождает подбор, проверку, выкуп и доставку автомобилей из стран Азии в Россию. ИНН {site.inn}, ОГРНИП {site.ogrn}. Адрес регистрации: {site.address}.</p>
    <h2>Кто сопровождает заказ</h2><div className="about-team">{managers.map((manager) => <section key={manager.name}><h3>{manager.name}</h3><p>Менеджер по регионам: {manager.regions}.</p><p><a href={`tel:${manager.phone.replace(/[^\d]/g, "")}`}>{manager.phone}</a> · <a href={manager.telegram} target="_blank" rel="noreferrer">Telegram</a></p></section>)}</div>
    <h2>Как проверяем автомобиль</h2><p>До выкупа команда сверяет доступную историю, документы, состояние кузова и технические параметры. Найденные ограничения и риски обсуждаются с клиентом до оплаты.</p>
    <h2>Как формируется результат</h2><p>Предварительный расчёт учитывает цену автомобиля и доступные расходы на доставку и оформление. Итоговые условия, маршрут, сроки, комплект документов и ответственность сторон фиксируются для выбранного автомобиля в договоре.</p>
    <p>Подробные реквизиты и ограничения ответственности опубликованы в <a href="/legal/legal-information">правовой информации</a>.</p></article></section>;
}
