import Link from "next/link";
import { Logo } from "@/components/logo";
import { site } from "@/config/site";

const managers = [
  { name: "Артур", phone: "8 (917) 041-88-55", regions: "Центральный, Приволжский и Северо-Западный ФО" },
  { name: "Павел", phone: "8 (912) 438-14-30", regions: "Уральский, Сибирский и Дальневосточный ФО" },
  { name: "Олег", phone: "8 (964) 093-59-56", regions: "Уральский, Сибирский и Дальневосточный ФО" }
] as const;

export function Footer() {
  return <footer className="site-footer" id="contacts">
    <div className="container footer-grid">
      <div><Logo /><p>Автомобили из Южной Кореи, Китая, Японии, Киргизии, США, ОАЭ и Канады</p></div>
      <div><h2>Навигация</h2><Link href="/#catalogs">Каталог</Link><Link href="/orders">Как заказать</Link><Link href="/#process">Этапы работы</Link></div>
      <div className="footer-contacts"><h2>Контакты</h2>{managers.map((manager) => { const phone = manager.phone.replace(/[^\d]/g, ""); const whatsapp = phone.replace(/^8/, "7"); return <details className="manager-contact" key={manager.name}><summary><span><b>{manager.name}</b><strong>{manager.phone}</strong></span><small>{manager.regions}</small></summary><div className="manager-links"><a href={`tel:${phone}`}>Позвонить</a><a href={site.telegram} target="_blank" rel="noreferrer">Telegram</a><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a></div></details>; })}<a className="telegram-channel" href={site.telegram} target="_blank" rel="noreferrer">Telegram-канал <span>AsiaTradeCar ↗</span></a>{site.email && <a href={`mailto:${site.email}`}>{site.email}</a>}</div>
    </div>
    <div className="container footer-bottom"><p className="footer-legal">© {new Date().getFullYear()} ASIA TRADE CAR. Не публичная оферта.<br/>{site.owner} · ИНН {site.inn} · ОГРНИП {site.ogrn}<br/>{site.address}<br/>Приём заявок на сайте: круглосуточно</p><nav aria-label="Юридические документы"><Link href="/legal/privacy">Политика</Link><Link href="/legal/consent">Согласие</Link><Link href="/legal/legal-information">Правовая информация</Link></nav></div>
  </footer>;
}
