import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { LeadForm } from "@/components/lead-form";
import { site } from "@/config/site";

const stages = [
  ["01", "Заявка и подбор", "Фиксируем бюджет и требования, показываем подходящие варианты из актуального источника."],
  ["02", "Проверка", "Проверяем историю, состояние, документы и расчёт до принятия решения."],
  ["03", "Договор и выкуп", "Закрепляем условия, согласуем расходы и выкупаем выбранный автомобиль."],
  ["04", "Логистика", "Организуем доставку, таможенное оформление и выдачу в согласованном городе."]
] as const;

export default async function Home() {
  const organization = { "@context": "https://schema.org", "@type": "Organization", name: site.name, url: site.url, ...(site.phone ? { telephone: site.phone } : {}), ...(site.email ? { email: site.email } : {}) };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }} />
    <section className="hero">
      <Image className="hero-image" src="/media/hero-import.png" alt="Чёрный автомобиль на горной дороге" fill sizes="100vw" priority />
      <div className="hero-shade" />
      <div className="container hero-content">
        <h1><span>Импорт автомобилей</span><strong>со всего мира</strong></h1>
        <p className="hero-lead">Полный цикл под ключ</p>
        <p className="hero-values">Быстро <i/> Честно <i/> Прозрачно</p>
        <div className="hero-buttons"><Link className="button hero-cta" href="/calculator">Рассчитать стоимость <Icon name="arrow" /></Link></div>
        <ul className="hero-facts">
          <li><Icon name="shield" /><span>Прозрачные<br/>условия</span></li>
          <li><Icon name="calculator" /><span>Фиксируем<br/>стоимость</span></li>
          <li><Icon name="route" /><span>Доставка<br/>до вашего города</span></li>
          <li><Icon name="check" /><span>Гарантия<br/>на всех этапах</span></li>
        </ul>
      </div>
    </section>

    <section className="section countries"><div className="container content-sheet"><div className="journey-hint"><Icon name="route"/><span>Листайте страницу — автомобиль движется по общему маршруту. При прокрутке назад он возвращается.</span></div><div className="section-heading"><div><p className="eyebrow">Направления</p><h2>Выберите рынок</h2></div><p>Начинаем с подтверждённого источника по Корее. Остальные направления подключим только после проверки данных.</p></div><div className="country-grid"><Link className="country-card active" href="/catalog?country=kr"><span className="country-code">KR</span><div><h3>Южная Корея</h3><p>Полный каталог из разрешённого источника</p></div><Icon name="arrow" /></Link><div className="country-card disabled"><span className="country-code">JP</span><div><h3>Япония</h3><p>Источник готовится</p></div></div><div className="country-card disabled"><span className="country-code">CN</span><div><h3>Китай</h3><p>Источник готовится</p></div></div></div></div></section>

    <section className="section dark-section" id="process"><div className="container"><div className="section-heading"><div><p className="eyebrow">Процесс</p><h2>От запроса до ключей</h2></div><p>На каждом этапе вы знаете, что происходит с автомобилем и за что платите.</p></div><ol className="stage-grid">{stages.map(([number, title, text]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></li>)}</ol></div></section>

    <section className="section request-section" id="request"><div className="container request-grid"><div><p className="eyebrow">Персональный подбор</p><h2>Выберите авто или опишите задачу</h2><p>Можно найти конкретный автомобиль во всём синхронизированном каталоге либо оставить выбор менеджеру по бюджету и требованиям.</p></div><LeadForm formId="home-selection" catalogSearch /></div></section>
  </>;
}
