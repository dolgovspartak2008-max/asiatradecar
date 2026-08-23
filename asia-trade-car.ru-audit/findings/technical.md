# Technical SEO — 84/100

Исправлено: единый indexing gate, чистый robots, country URLs, 308 legacy redirects, crawlable pagination, active vehicle sitemap, реальные 404.

Осталось:

- High conditional: 50 000 авто + 6 static URLs превышают лимит sitemap.
- Medium: произвольный пустой `page=N` возвращает indexable 200.
- Medium: DB failure молча удаляет все vehicle URLs из sitemap.
- Low: trailing slash в `SITE_URL`, home canonical на noindex utility pages.
- Live не подтверждены TLS, HSTS/CDN и production env.

