import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import { LeadForm } from "@/components/lead-form";
import { CatalogChooser } from "@/components/catalog-chooser";

export const metadata: Metadata = { title: "Как заказать автомобиль", description: "Этапы подбора, проверки, выкупа, доставки и выдачи автомобиля из Южной Кореи, Японии и Китая.", alternates: { canonical: "/orders" } };

const steps = [
  ["Заявка", "Фиксируем бюджет, класс автомобиля, год, пробег и город получения."],
  ["Подбор", "Показываем подходящие лоты из полного актуального каталога и объясняем разницу между вариантами."],
  ["Проверка", "Проверяем историю, документы, состояние кузова и технические параметры до оплаты."],
  ["Договор и расчёт", "Закрепляем выбранный автомобиль, состав расходов и порядок оплаты."],
  ["Выкуп и доставка", "Выкупаем автомобиль, организуем отправку в порт, морскую и наземную логистику."],
  ["Таможня и выдача", "Сопровождаем оформление и передаём автомобиль в согласованном городе."]
] as const;

const documents = ["Договор с согласованными условиями", "Отчёт по выбранному автомобилю", "Расчёт стоимости по этапам", "Документы на оплату и перевозку", "Комплект документов после таможни"];

export default function OrdersPage() {
  return <>
    <section className="orders-hero"><div className="container orders-hero-content"><span>ASIA TRADE CAR</span><h1>Как заказать автомобиль</h1><p>Один понятный маршрут: от требований и проверки лота до таможни и выдачи в вашем городе.</p><div><CatalogChooser label="Выбрать автомобиль" /></div></div></section>

    <section className="section orders-process"><div className="container content-sheet"><div className="section-heading"><div><h2>Заказ по шагам</h2></div><p>Каждый следующий этап начинается после согласования результата предыдущего.</p></div><ol className="orders-timeline">{steps.map(([title, text], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol></div></section>

    <section className="section orders-control"><div className="container orders-control-grid"><div><h2>Что остаётся под контролем</h2><p>До оплаты вы видите автомобиль, проверку и расчёт. По ходу доставки получаете документы по пройденным этапам.</p><ul>{documents.map((item) => <li key={item}><Icon name="check"/><span>{item}</span></li>)}</ul></div><div className="orders-cost"><h3>Из чего складывается стоимость</h3><dl><div><dt>Автомобиль</dt><dd>цена лота</dd></div><div><dt>Проверка и выкуп</dt><dd>по договору</dd></div><div><dt>Логистика</dt><dd>страна покупки, море, Россия</dd></div><div><dt>Таможня</dt><dd>по параметрам авто</dd></div><div><dt>Доставка до города</dt><dd>по маршруту</dd></div></dl><CatalogChooser className="text-link" label="Выбрать авто с готовым расчётом" /></div></div></section>

    <section className="section orders-faq"><div className="container"><div className="section-heading"><div><h2>Частые вопросы</h2></div><p>Короткие ответы до начала подбора.</p></div><div className="faq-list"><details><summary>Можно выбрать конкретный автомобиль?</summary><p>Да. Откройте каталог, сохраните интересующие лоты или укажите модель и номер лота в заявке.</p></details><details><summary>Стоимость фиксируется заранее?</summary><p>До выкупа формируется расчёт по известным расходам. Изменяемые платежи и допущения показываются отдельно.</p></details><details><summary>Можно заказать автомобиль, которого нет в первых карточках?</summary><p>Да. Кнопка «Показать ещё» последовательно открывает весь каталог источника.</p></details><details><summary>Что происходит после заявки?</summary><p>Менеджер уточняет требования, предлагает варианты и только после вашего согласия начинает проверку выбранного автомобиля.</p></details></div></div></section>

    <section className="section request-section" id="order-request"><div className="container request-grid"><div><h2>Начать подбор</h2><p>Опишите желаемый автомобиль, бюджет и город получения.</p></div><LeadForm formId="orders" /></div></section>
  </>;
}
