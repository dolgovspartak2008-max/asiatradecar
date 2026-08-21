import Link from "next/link";
import { Icon } from "@/components/icons";
import { LeadForm } from "@/components/lead-form";
import { VideoHero } from "@/components/video-hero";
import { Testimonials } from "@/components/testimonials";
import { site } from "@/config/site";

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
  const organization = { "@context": "https://schema.org", "@type": "Organization", name: site.name, url: site.url, ...(site.phone ? { telephone: site.phone } : {}), ...(site.email ? { email: site.email } : {}) };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }} />
    <section className="hero">
      <VideoHero />
      <div className="container hero-content">
        <h1><span>Импорт автомобилей</span>{" "}<strong>со всего мира</strong></h1>
        <div className="hero-buttons"><Link className="button button-ghost hero-catalog-link" href="/catalog?country=kr">Смотреть каталог <Icon name="arrow" /></Link></div>
        <ul className="hero-facts">
          <li><Icon name="shield" /><span>Прозрачные<br/>условия</span></li>
          <li><Icon name="calculator" /><span>Фиксируем<br/>стоимость</span></li>
          <li><Icon name="route" /><span>Доставка<br/>до вашего города</span></li>
          <li><Icon name="check" /><span>Гарантия<br/>на всех этапах</span></li>
        </ul>
      </div>
    </section>

    <section className="section countries"><div className="container content-sheet"><div className="section-heading"><div><p className="eyebrow">Направления</p><h2>Выберите рынок</h2></div></div><div className="country-grid"><Link className="country-card active" href="/catalog?country=kr"><span className="country-code">KR</span><div><h3>Корея</h3></div><Icon name="arrow" /></Link><Link className="country-card" href="/catalog?country=jp"><span className="country-code">JP</span><div><h3>Япония</h3></div><Icon name="arrow" /></Link><Link className="country-card" href="/catalog?country=cn"><span className="country-code">CN</span><div><h3>Китай</h3></div><Icon name="arrow" /></Link></div></div></section>

    <section className="section dark-section" id="process"><div className="container"><div className="section-heading"><div><p className="eyebrow">Процесс</p><h2>От запроса до ключей</h2></div><p>На каждом этапе вы знаете, что происходит с автомобилем и за что платите.</p></div><ol className="stage-grid">{stages.map(([number, title, text]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></li>)}</ol><details className="responsibility"><summary>За что мы отвечаем <Icon name="arrow" /></summary><div><p className="eyebrow">Полное сопровождение</p><h3>Вам не нужно разбираться во всём самому</h3><ul>{responsibilities.map((item) => <li key={item}><Icon name="check"/><span>{item}</span></li>)}</ul><Link className="button" href="#request">Получить расчёт</Link></div></details></div></section>

    <Testimonials />

    <section className="section request-section" id="request"><div className="container request-grid"><div><p className="eyebrow">Персональный подбор</p><h2>Опишите задачу</h2><p>Укажите бюджет, предпочтения и город получения — менеджер предложит подходящие варианты.</p></div><LeadForm formId="home-selection" /></div></section>
  </>;
}
