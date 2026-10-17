# Архітектура v2.5.0

## Статичний шлях

```text
product-config + section-config + templates/page.html
  → landing-render → content facades → scripts/sections/*
  → index.html + Product JSON-LD hash + vercel.json / robots / sitemap

design-config + design-themes + templates/styles.css
  → theme-render → styles.css + HTML meta theme-color
```

`scripts/sync-product.mjs` і `sync-sales.mjs` — сумісні entry points одного `sync-landing.mjs`. `--check` нічого не записує і відхиляє drift. Outputs комітяться: serving статичних файлів не потребує generator runtime. Нових залежностей немає.

Товар, склад секцій і дизайн мають різні джерела відповідальності. Поточний `PRODUCT_CONFIG.sections` посилається на defaults з section-config; тема не імпортує товар/секції. Config validation відбувається перед генерацією. HTML екранується, JSON-LD серіалізується з escaping небезпечних символів; довільний HTML/CSS із конфігурації не виконується. Theme values обмежені схемою. Стандартний DOM, ID та ARIA зберігаються.

Renderer facades `product-render.mjs`, `sales-render.mjs`, exports `shared/product.js`, `shared/sales-content.js` використовуються чинними тестами/модулями, тому не є невикористаними дублями. Так само `templates/styles.css`, generated `styles.css` та regression CSS fixture мають різні ролі, хоча містять подібний текст.

Підтримувані секції й їхні залежності: [reusable-sections.md](reusable-sections.md). Схема товару: [product-configuration.md](product-configuration.md). Токени: [design-themes.md](design-themes.md).

## Browser runtime

`script.js` ізолює analytics initialization від замовлення. Форма, anchor offsets і navigation мають guards для вимкнених секцій. Mobile header у потоці, desktop header sticky; mobile bar потребує Hero та Order, ховається поблизу форми/при focus/ймовірній клавіатурі. Optional `experience.js` імпортується динамічно, reduced motion залишає контент читабельним. `sales.js` керує наявним reviews shell; production reviews порожні. Наявний localhost-only review fixture зберігається для QA, нового Demo Mode не створено; `mode: sales` не змінено.

## Заявка → API → Telegram

1. Focus/input позначає початок checkout attempt. Клієнт нормалізує ім'я/телефон shared validation.
2. JSON `POST /api/order`: лише `name`, `phone`, `bot-field`. Ціни/UTM/consent до payload не додаються.
3. Сервер незалежно перевіряє method, Origin/Fetch Metadata, Content-Type, 2 KiB, allowlist, honeypot та поля. Сервер бере назву й ціну з `shared/product.js`.
4. Telegram `sendMessage`: plain text, server-only credentials, deadline 8 s, без автоматичних retries. HTTP 200 і `ok: true` з integer message_id необхідні для success.
5. Клієнтський deadline 12 s. Успіх очищує форму й дає один generate_lead; відмова лишає введене, відновлює controls. In-flight/lastAccepted guards — локальні, не розподілена idempotency.

| Відповідь | Умова |
| --- | --- |
| 200 | Підтверджений Telegram success |
| 400 / 403 / 405 / 413 / 415 / 422 | Дані / cross-site / method / розмір / формат / honeypot |
| 502 | Telegram HTTP/JSON/network failure |
| 503 | Немає credentials або Telegram 429; для останнього Retry-After 60 |
| 504 | Deadline провайдера; повідомлення могло надійти |
| 429 | Очікувана відповідь зовнішнього WAF, не власного distributed limiter |

Native form без JS надсилає URL-encoded body, а API приймає лише JSON; доступний static контент не означає no-JS order support. Цей реліз не змінює контракт.

## Analytics і дані

Consent record — localStorage, до 180 днів, fail-closed. Tag завантажується тільки після згоди та на точному production hostname. Marketing first touch читає URL/зберігає перевірені коди в sessionStorage тільки після згоди. Withdrawal зупиняє tracking, видаляє queue/marketing record та best-effort доступні GA cookies; вже надіслані дані не відкликаються.

GA4 отримує allowlisted product/event/campaign fields; ім'я, телефон і form payload не передаються. URL для page_location фіксований, raw query/referrer не додаються. IP як мережеві метадані Google/hosting не можна виключити власним payload filter. GA4 account settings і Google Fonts залишаються зовнішніми залежностями. Деталі: [analytics.md](analytics.md), [marketing-attribution.md](marketing-attribution.md).

## Deployment boundary

Static hosting + Vercel Node Function, без БД/CMS/frontend framework. `vercel.json` задає headers і function duration, але не активує рекомендоване WAF правило. Локальний dev server не є production security emulator. Зовнішні дії та доступи: [deployment.md](deployment.md), [security.md](security.md). Фінальні evidence та readiness gaps: [release-v2.5.0.md](release-v2.5.0.md).
