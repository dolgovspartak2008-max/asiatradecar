import Link from "next/link";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { site } from "@/config/site";

export const managers = [
  { name: "Артур", phone: "8 (917) 041-88-55", regions: "Центральный, Приволжский и Северо-Западный ФО", telegram: "https://t.me/artur_sagitov02", max: "https://max.ru/u/f9LHodD0cOItMxlXXoEhaybALvGJ3YHEVRIOiPMzHsHN-P59s2x9ukGHEBU" },
  { name: "Павел", phone: "8 (912) 438-14-30", regions: "Уральский, Сибирский и Дальневосточный ФО", telegram: "https://t.me/pavel_platonov290989", max: "https://max.ru/u/f9LHodD0cOJiC9iSnfthYjRc63mxfjhHS-qPgrtfGO_u8Mvj2R981pbNip8" },
  { name: "Олег", phone: "8 (964) 093-59-56", regions: "Уральский, Сибирский и Дальневосточный ФО", telegram: "https://t.me/Oleg_Ohty", max: "https://max.ru/u/f9LHodD0cOJ3oEukbK_sITK0UPK7Ubgv_FnXYP4WsAg0bUr0mJFtePlS4J0" }
] as const;

export function Footer() {
  return <footer className="site-footer" id="contacts">
    <div className="container footer-grid">
      <div><Logo /><p>Автомобили из Южной Кореи, Китая, Японии, Киргизии, США, ОАЭ и Канады</p></div>
      <div><h2>Навигация</h2><Link href="/#catalogs">Каталог</Link><Link href="/orders">Как заказать</Link><Link href="/about">О компании</Link><Link href="/#process">Этапы работы</Link></div>
       <div className="footer-contacts"><h2>Контакты</h2>{managers.map((manager) => { const phone = manager.phone.replace(/[^\d]/g, ""); const whatsapp = phone.replace(/^8/, "7"); return <details className="manager-contact" key={manager.name}><summary><span><b>{manager.name}</b><strong>{manager.phone}</strong></span><small>{manager.regions}</small></summary><div className="manager-links"><a href={`tel:${phone}`}>Позвонить</a><a href={manager.telegram} target="_blank" rel="noreferrer">Telegram</a><a href={manager.max} target="_blank" rel="noreferrer">MAX</a><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a></div></details>; })}<div className="footer-social-links"><a className="social-link" href={site.telegram} target="_blank" rel="noreferrer"><span>Telegram</span><Icon name="arrow" /></a><a className="social-link" href={site.max} target="_blank" rel="noreferrer"><span>MAX</span><Icon name="arrow" /></a><a className="social-link" href={site.vk} target="_blank" rel="noreferrer"><span>VK</span><Icon name="arrow" /></a><a className="social-link" href={site.youtube} target="_blank" rel="noreferrer"><span>YouTube</span><Icon name="arrow" /></a><a className="social-link" href={site.instagram} target="_blank" rel="noreferrer"><span>Instagram</span><Icon name="arrow" /></a></div>{site.email && <a href={`mailto:${site.email}`}>{site.email}</a>}</div>
    </div>
    <div className="container footer-bottom"><p className="footer-legal">© {new Date().getFullYear()} ASIA TRADE CAR. Не публичная оферта.<br/>{site.owner} · ИНН {site.inn} · ОГРНИП {site.ogrn}<br/>{site.address}<br/>Приём заявок на сайте: круглосуточно</p><nav aria-label="Юридические документы"><Link href="/legal/privacy">Политика</Link><Link href="/legal/consent">Согласие</Link><Link href="/legal/legal-information">Правовая информация</Link></nav></div>
  </footer>;
}
