import Link from "next/link";
import { Logo } from "@/components/logo";
import { launchReady, site } from "@/config/site";

export function Footer() {
  return <footer className="site-footer" id="contacts">
    <div className="container footer-grid">
      <div><Logo /><p>Автомобили из Азии с проверкой, прозрачным расчётом и сопровождением доставки.</p></div>
      <div><h2>Навигация</h2><Link href="/catalog?country=kr">Каталог</Link><Link href="/calculator">Калькулятор</Link><Link href="/#process">Этапы работы</Link></div>
      <div><h2>Документы</h2><Link href="/legal/privacy">Политика обработки данных</Link><Link href="/legal/consent">Согласие на обработку данных</Link><Link href="/legal/legal-information">Правовая информация</Link></div>
      <div><h2>Контакты</h2>{site.phone && <a href={`tel:${site.phone.replace(/[^+\d]/g, "")}`}>{site.phone}</a>}{site.email && <a href={`mailto:${site.email}`}>{site.email}</a>}{site.telegram && <a href={site.telegram} rel="noreferrer">Telegram</a>}{!site.phone && !site.email && <p>Контакты появятся после подтверждения реквизитов оператора.</p>}</div>
    </div>
    <div className="container footer-bottom"><p>© {new Date().getFullYear()} ASIA TRADE CAR. Информация на сайте не является публичной офертой.</p>{!launchReady && <p className="setup-warning">Локальная сборка: юридические реквизиты, срок хранения и публичный HTTPS-домен требуют заполнения до публикации.</p>}</div>
  </footer>;
}
