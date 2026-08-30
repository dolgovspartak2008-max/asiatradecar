import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { LeadForm } from "@/components/lead-form";
import { VideoHero } from "@/components/video-hero";
import { Testimonials } from "@/components/testimonials";
import { CatalogChooser } from "@/components/catalog-chooser";
import { CatalogLinkStatus } from "@/components/catalog-link-status";
import { site } from "@/config/site";
import { buildOrganizationSchema } from "@/domain/seo";

export const revalidate = 0;

const stages = [
  ["01", "Заявка", "Уточняем страну, бюджет, модель, комплектацию, пробег и город получения."],
  ["02", "Подбор", "Сравниваем доступные предложения и заранее рассчитываем итоговую стоимость."],
  ["03", "Проверка", "Проверяем историю, документы, состояние кузова и технические параметры."],
  ["04", "Договор и выкуп", "Фиксируем условия и расходы в договоре, бронируем и оплачиваем автомобиль."],
  ["05", "Доставка и таможня", "Контролируем перевозку, оформление и подготовку комплекта документов."],
  ["06", "Выдача", "Доставляем автомобиль в согласованный город и остаёмся на связи после получения."]
] as const;

const responsibilities = [
  "Помогаем выбрать страну, модель и комплектацию под ваш бюджет",
  "Считаем итоговую стоимость заранее, чтобы не было неприятных сюрпризов",
  "Проверяем варианты и предупреждаем о рисках до покупки",
  "Занимаемся покупкой, доставкой, документами и сопровождением",
  "Держим в курсе на этапах: что купили, где машина и что дальше",
  "Привозим не только авто: мотоциклы, спецтехнику и автодома под запрос"
] as const;

export default async function Home() {
  const organization = buildOrganizationSchema({ name: site.name, owner: site.owner, inn: site.inn, ogrn: site.ogrn, address: site.address, url: site.url, logo: "/media/asia-trade-car-logo-transparent.webp", phone: site.phone, email: site.email, sameAs: [site.telegram, site.instagram, site.max, site.youtube, site.vk] });
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }} />
    <section className="hero">
      <VideoHero />
      <div className="container hero-content">
        <h1><span>Импорт автомобилей</span>{" "}<strong>из-за рубежа</strong></h1>
        <div className="hero-buttons"><a className="button" href="#request">Получить подбор</a><CatalogChooser className="button button-ghost hero-catalog-link" label="Смотреть каталог" /></div>
        <ul className="hero-facts">
          <li><Icon name="shield" /><span>Прозрачные<br/>условия</span></li>
          <li><Icon name="calculator" /><span>Фиксируем<br/>стоимость</span></li>
          <li><Icon name="route" /><span>Доставка<br/>до вашего города</span></li>
          <li><Icon name="check" /><span>Гарантия<br/>на всех этапах</span></li>
        </ul>
      </div>
    </section>

    <section className="section dark-section" id="process"><div className="container"><div className="section-heading"><div><p className="eyebrow">Процесс</p><h2>От запроса до ключей</h2></div><p>На каждом этапе вы знаете, что происходит с автомобилем и за что платите.</p></div><ol className="stage-grid">{stages.map(([number, title, text]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></li>)}</ol><details className="responsibility"><summary>За что мы отвечаем <Icon name="arrow" /></summary><div><p className="eyebrow">Полное сопровождение</p><h3>Вам не нужно разбираться во всём самому</h3><ul>{responsibilities.map((item) => <li key={item}><Icon name="check"/><span>{item}</span></li>)}</ul><div className="responsibility-actions"><a className="button" href="#request">Получить расчёт</a></div></div></details></div></section>

    <section className="section countries" id="catalogs"><div className="container content-sheet"><div className="section-heading"><div><p className="eyebrow">Направления</p><h2>Выберите рынок</h2></div></div><div className="country-grid"><Link className="country-card" href="/catalog/korea"><span className="country-code">KR</span><div className="country-card-copy"><h3>Южная Корея</h3><CatalogLinkStatus className="country-card-pending" /></div><Icon name="arrow" /></Link><Link className="country-card" href="/catalog/japan" prefetch={false}><span className="country-code">JP</span><div className="country-card-copy"><h3>Япония</h3><CatalogLinkStatus className="country-card-pending" /></div><Icon name="arrow" /></Link><Link className="country-card" href="/catalog/china"><span className="country-code">CN</span><div className="country-card-copy"><h3>Китай</h3><CatalogLinkStatus className="country-card-pending" /></div><Icon name="arrow" /></Link></div></div></section>

    <Suspense fallback={null}><Testimonials /></Suspense>

    <section className="section request-section" id="request"><div className="container request-grid"><div><p className="eyebrow">Персональный подбор</p><h2>Опишите задачу</h2><p>Укажите бюджет, предпочтения и город получения — менеджер предложит подходящие варианты.</p></div><LeadForm formId="home-selection" /></div></section>
  </>;
}
