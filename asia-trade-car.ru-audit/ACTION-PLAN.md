# Актуальный SEO action plan

Дата: 23 августа 2026 года  
Текущий Health Score: **79/100**

## P0 — перед production-индексацией

1. Проверить live `robots.txt`, homepage meta robots, canonical, TLS и redirect HTTP→HTTPS.
2. Убедиться, что `SITE_URL` задан без завершающего `/`, а `SITE_INDEXING_DISABLED` не равен `true`.
3. Проверить ожидаемое число `/auto/*` в sitemap; поставить alert на резкое падение.
4. Согласовать «фиксируем/под ключ» с «предварительно/расходы отдельно» во всех видимых и legal-текстах.

## P1 — ближайший спринт

1. Разбить sitemap: не более 50 000 URL на файл, лучше sitemap index / `generateSitemaps`.
2. Для page выше последней вернуть 404 либо `noindex,follow`; добавить тест `page=999999`.
3. Не скрывать DB/sitemap failure: telemetry + alert; определить fallback inventory source.
4. Нормализовать `SITE_URL` удалением trailing slash.
5. Очистить inherited home canonical на noindex favorites/legal.
6. Добавить `BreadcrumbList` на карточки, затем `WebSite` на главную.

## P2 — Trust, content, GEO

1. Добавить роли, стаж и зоны ответственности менеджеров.
2. Публиковать проверяемые кейсы с датой, моделью, рынком, состоянием, рисками, ценой, маршрутом, сроком и результатом.
3. Атрибутировать отзывы: имя/инициалы, город, дата, источник или механизм проверки.
4. На карточках показывать фактические дату актуальности, результат проверки, дефекты/риски, документы и состав цены.
5. Согласовать scope: Азия/KR-JP-CN против упоминаний других стран.
6. Добавить page-specific OG/Twitter для Orders/About.

## P2 — Performance и accessibility

1. Lighthouse mobile для `/`, трёх market URLs и одной `/auto/*` на production.
2. CrUX baseline: LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1 на p75.
3. Проверить waterfall hero video; при риске заменить autoplay на poster-first или загрузку после interaction/idle.
4. Вернуть mobile form controls к 16 px.
5. Поднять контраст мелкого gold text/focus state до WCAG AA.
6. Добавить field-level errors, `aria-invalid`, `aria-describedby`, form names и 44 px touch targets.

## P3 — измерение и authority

1. Подключить Search Console, отправить sitemap и проверить sample URL Inspection.
2. Мониторить indexed/discovered vehicle ratio, canonical selection, crawl stats и soft 404.
3. Подключить backlink source; до 4/7 факторов не публиковать числовой backlink score.
4. Сверить домен, бренд, реквизиты и контакты в официальных профилях.
5. Получать редакционные/партнёрские ссылки через оригинальные данные и кейсы.

## Definition of Done для 90+

- live indexability и sitemap автоматически мониторятся;
- sitemap не превышает лимиты и не исчезает при сбое DB;
- пустые страницы пагинации не индексируются;
- pricing promise полностью согласован;
- vehicle pages содержат проверяемые уникальные данные;
- Lighthouse/CrUX baseline соответствует целям;
- GSC подтверждает discovery/indexing inventory;
- E-E-A-T подкреплён авторами, кейсами и отзывами;
- backlink profile измерим.

