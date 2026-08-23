# Повторный полный SEO-аудит ASIA TRADE CAR

Дата: 23 августа 2026 года  
SEO Health Score: **79/100** (было 58/100, рост +21)  
Тип сайта: **сервисный лендинг + динамический автомобильный каталог**  
SXO Score: **77/100**

## Итог

Критические проблемы первого аудита устранены: production-индексация больше не зависит от юридических env-полей, созданы отдельные каталоги Кореи/Японии/Китая, добавлена crawlable-пагинация, карточки авто включаются в sitemap, разметка обновлена до `Product + Car`, медиа существенно облегчены, появилась страница компании и первичные источники ФТС/ЭПТС.

Сайт технически готов к индексации **при корректном production `SITE_URL` и доступной БД**. Главный остаточный риск — обещания «фиксированной/под ключ» цены расходятся с оговорками о предварительном расчёте и отдельных расходах.

## Проверено

- production build Next.js 16.3.1;
- TypeScript, ESLint и 119 автоматических тестов;
- SSR/HTTP для главной, About, Orders, трёх country-каталогов, пагинации, фильтра, favorites, legal, 404 и двух карточек авто;
- `robots.txt`, `sitemap.xml`, canonical, robots meta, redirects, H1, JSON-LD и cache headers;
- desktop 1440×900 и mobile 390×844;
- размеры медиа, responsive image path и reduced-motion;
- content, E-E-A-T, SXO, GEO, schema, images и accessibility.

Не проверены live DNS/TLS/CDN, production env/DB, Google Search Console, GA4, CrUX, Rich Results Test и полный backlink graph. Полевые CWV и числовая backlink-оценка поэтому не заявляются.

## Оценки

| Категория | Вес | Было | Стало |
|---|---:|---:|---:|
| Technical SEO | 22% | 61 | **84** |
| Content Quality | 23% | 61 | **72** |
| On-Page SEO | 20% | 57 | **82** |
| Schema | 10% | 58 | **82** |
| Performance, CWV proxy | 10% | 56 | **74** |
| AI Search / GEO | 10% | 52 | **76** |
| Images | 5% | 49 | **88** |
| **Итого** | **100%** | **58** | **79** |

Дополнительно:

- E-E-A-T: **60/100**;
- SXO: **77/100**;
- Visual/Mobile/A11y: **82/100**;
- Sitemap quality: **72/100**;
- Backlinks: **INSUFFICIENT DATA (0/7 факторов)**.

## Подтверждённые исправления

1. `robots.txt` и global robots meta используют единый индексирующий флаг; реквизиты и retention больше не закрывают production.
2. `/catalog/korea`, `/catalog/japan`, `/catalog/china` имеют уникальные title, description, H1 и self-canonical.
3. Старый `/catalog?country=*` отдаёт постоянный 308 на новый URL с сохранением параметров.
4. Фильтры получают `noindex,follow`, обычная пагинация индексируема и имеет self-canonical.
5. В SSR есть обычные ссылки Previous/Next, обход не зависит от кнопки load-more.
6. Sitemap содержит основные canonical URL и активные `/auto/*` из БД с `updated_at` и первой картинкой.
7. Vehicle schema заменена на `Product + Car`; Offer выводится только при видимой положительной RUB-цене.
8. Organization schema получила `@id`, legalName, ИНН/ОГРНИП, адрес, контакты и `sameAs`.
9. Карточки получили уникальные metadata, breadcrumbs, source link и объяснение проверки/договора.
10. Добавлена `/about` с юридической сущностью, командой и процессом проверки.
11. Hero использует один video, WebP poster и кнопку паузы; `prefers-reduced-motion` останавливает видео.
12. Используемые локальные изображения переведены в WebP, catalog/gallery используют Next image optimizer.
13. Главная переведена на ISR 3600 секунд.

## HTTP smoke test

| URL | Статус | Robots | Canonical | Результат |
|---|---:|---|---|---|
| `/` | 200 | index, follow | `/` | 1 H1, 2 JSON-LD |
| `/about` | 200 | index, follow | self | уникальные metadata |
| `/orders` | 200 | index, follow | self | корректно |
| `/catalog/korea` | 200 | index, follow | self | 24 SSR-карточки |
| `/catalog/japan` | 200 | index, follow | self | 24 SSR-карточки |
| `/catalog/china` | 200 | index, follow | self | 24 SSR-карточки |
| `/catalog/korea?page=2` | 200 | index, follow | page 2 | уникальный title |
| `/catalog/korea?make=Hyundai` | 200 | noindex, follow | clean market | корректно |
| `/catalog/favorites` | 200 | noindex, follow | home | canonical стоит очистить |
| `/legal/privacy` | 200 | noindex, follow | home | canonical стоит очистить |
| несуществующий URL | 404 | noindex | home | настоящий 404 |
| две sample `/auto/*` | 200 | index, follow | self | 2 JSON-LD |

Локальные cold response times: home 188 ms, Korea 299 ms, Japan 2483 ms, China 1053 ms. Это не production CWV; задержка каталогов зависит от внешних источников.

## Остаточные проблемы

### High — противоречивое обещание цены и «гарантии»

Главная и карточки используют «фиксируем стоимость», «под ключ в РФ», «без неприятных сюрпризов» и «гарантия на всех этапах». Ниже цена названа предварительной, а часть логистики может считаться отдельно. Для дорогой покупки это снижает Trust и конверсию.

Нужно единообразно объяснить: что входит, что меняется, в какой момент фиксируется и чем подтверждается.

### High, условно — sitemap может превысить 50 000 URL

SQL допускает 50 000 автомобилей, затем добавляются ещё 6 статических URL. При 49 995+ активных карточках sitemap выйдет за лимит. Нужен sitemap index / `generateSitemaps` или меньший лимит автомобильной части.

Стандарт: [Google — Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

### Medium — indexable пустые страницы пагинации

`?page=N` индексируется без проверки верхней границы. `/catalog/korea?page=999999` ответил 200 с пустой выдачей и self-canonical. Это soft-404/index bloat риск.

Нужно возвращать 404 для page выше последней либо `noindex,follow` для пустой выдачи.

### Medium — sitemap зависит от БД и скрывает сбой

При ошибке DB `getSitemapCars()` возвращает пустой список, хотя live-каталог работает через внешние источники. Проверенный локальный XML содержал только 6 статических URL.

Нужен мониторинг числа URL/свежести sitemap и явная стратегия inventory для режима без БД.

### Medium — vehicle content остаётся тонким

Уникальные характеристики и два авторских абзаца есть, но нет даты актуальности, конкретного заключения осмотра, дефектов/рисков, маршрута, документов и состава цены именно для этой машины. Добавлять только фактические данные.

### Medium — E-E-A-T и отзывы недостаточно проверяемы

About показывает имена и регионы, но не роли, стаж, опыт и подтверждённые кейсы. Отзывы не имеют имени/инициалов, даты, города и первичного URL/механизма проверки.

### Medium — performance не подтверждён полевыми данными

Hero poster уменьшен до 68 988 B, reviews примерно на 96%, но autoplay video остаётся 2.07 MiB. Каталоги dynamic/private no-store; локальный cold Japan response занял 2.48 s. Нужны production Lighthouse mobile, CrUX и TTFB monitoring.

### Medium — mobile и accessibility

- form controls вычисляются как 15 px на mobile, возможен iOS zoom;
- мелкие gold text/focus ring местами ниже WCAG AA;
- нет field-level `aria-invalid`/`aria-describedby`;
- часть touch targets ниже 44 px;
- favorite не имеет `aria-pressed`, mobile menu не меняет accessible label.

При 390×844 и 1440×900 горизонтального скролла не найдено; H1 и CTA видимы, console errors отсутствуют.

### Medium/Low — entity/schema и social metadata

- нет `WebSite`, `Service` и `BreadcrumbList`;
- Orders наследует часть homepage OG/Twitter, About не задаёт Twitter отдельно;
- noindex favorites/legal наследуют canonical главной;
- `SITE_URL` с завершающим `/` создаст двойные слеши.

### Low — scope и security headers

Home H1 говорит «из-за рубежа», а основная сущность — импорт из Азии. Footer упоминает дополнительные страны без соответствующих страниц. CSP и HSTS не заданы в repo config; HSTS может добавляться CDN и проверяется live.

## E-E-A-T

| Фактор | Оценка |
|---|---:|
| Experience | 16/25 |
| Expertise | 14/25 |
| Authoritativeness | 11/25 |
| Trustworthiness | 19/25 |

Наибольший рост дадут проверяемые кейсы: автомобиль, дата, рынок, состояние, выявленный риск, цена по этапам, срок, маршрут, документы и результат.

## On-page и SXO

Page type соответствует intent:

- home — commercial service landing;
- country catalog — hybrid landing + inventory;
- vehicle — transactional listing/product;
- orders — informational-commercial;
- about — entity/trust page.

Country intent и product metadata исправлены. Остались короткие descriptions, неполные social cards, широкий H1 главной и пустые indexable `page=N`. Главный SXO gap — Trust.

## Schema

`Product + Car` и Organization совпадают с видимыми фактами; пустая image, нулевая цена и неподтверждённая availability не публикуются. Следующий приоритет — `BreadcrumbList`, затем `WebSite`.

Стандарт: [Google — Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product).

## Images и CWV proxy

- hero poster: 1 790 027 → 68 988 B, −96.1%;
- review sources: 14 196 182 → 526 522 B, −96.3%;
- logo: 164 429 → 74 758 B, −54.5%;
- remote car images получают responsive `srcset`;
- aspect-ratio сохраняет CLS-защиту;
- hero video: 2 165 882 B — главный transfer-risk.

Старые PNG остались в deploy bundle, но не используются в runtime.

## GEO / AI Search

GEO вырос до 76/100 благодаря SSR, entity page, market/process структуре, первичным источникам и Organization. Главный пробел — отсутствие датированных оригинальных данных, проверяемых кейсов и экспертского авторства. `llms.txt` не является приоритетом.

Стандарт: [Google — AI features and your website](https://developers.google.com/search/docs/appearance/ai-features).

## Backlinks

**INSUFFICIENT DATA, 0/7 факторов.** Нет достоверных referring domains, anchors, authority, toxic ratio, velocity, follow ratio и geography. Brand mentions не считаются backlinks.

## Вердикт

Сайт перешёл из состояния «существенный риск индексации и discovery» в состояние «можно индексировать после production smoke test». До уровня 90+ не хватает чистой sitemap edge-case модели, устранения soft-404 pagination, согласованной цены, сильных кейсов/E-E-A-T и реальных CWV/backlink данных.

