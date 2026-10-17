# Mini Printer Landing — v2.5.0

Готова технологічна основа товарного лендінгу BeBetter Development: статична українськомовна сторінка Mini Printer, конфігурація контенту, керовані секції, тема Pocket Studio та серверне передавання заявок у Telegram. Режим конфігурації залишається `sales`. Продажі, рекламні результати й бізнес-метрики цим репозиторієм не підтверджуються.

## Основні можливості

- Вісім секцій з керованими видимістю й порядком; залежні посилання та CTA узгоджуються під час генерації.
- Незалежні конфігурації товару, секцій і дизайну; детерміновані HTML/CSS та Product JSON-LD.
- Адаптивна сторінка, FAQ, локальне відео, mobile sticky CTA, keyboard focus і reduced motion.
- Форма з клієнтською та серверною валідацією, контрольованими loading/success/error станами.
- GA4 лише після згоди, відкликання згоди та перевірена UTM-атрибуція без даних заявки.

## Технології

HTML, CSS custom properties, vanilla JavaScript ES modules, Node.js 22.x, Vercel Functions, Telegram Bot API, Google Analytics 4. Npm-залежностей немає. Використовуються Manrope з Google Fonts і локальні медіа.

## Архітектура

| Каталог / файл | Призначення |
| --- | --- |
| `shared/` | Конфігурації, їхня валідація, сумісні product/sales exports, shared order validation |
| `templates/` | Канонічні HTML та CSS |
| `scripts/sections/` | Невеликі незалежні генератори секцій |
| `scripts/sync-landing.mjs` | Спільна генерація HTML/CSS, SEO та CSP hash |
| `index.html`, `styles.css` | Закомічені статичні outputs, які обслуговує hosting |
| `script.js`, `sales.js`, `experience.js` | Форма, навігація, sticky bar та progressive enhancement |
| `analytics.js`, `consent.js`, `attribution.js` | Ізольовані consent/analytics/UTM модулі |
| `api/order.js` | JSON POST → незалежна валідація → Telegram → підтверджена відповідь |
| `tests/` | Автономні тести без реальних заявок |

Потоки даних й обґрунтування рішень: [architecture.md](docs/architecture.md).

## Встановлення та локальний запуск

Потрібні Git та Node.js 22.x. `npm install` не потрібен.

```sh
git clone https://github.com/Velykobrat/mini-printer-landing.git
cd mini-printer-landing
npm run dev
```

Відкрийте `http://127.0.0.1:4173`. Локальний сервер навмисно працює з порожнім environment для API: він не завантажує production credentials і не надсилає Telegram. Валідна локальна заявка поверне 503; для success/error сценаріїв тести використовують mocks. Локальний сервер не відтворює Vercel security headers/WAF.

## Конфігурація товару

Редагуйте `shared/product-config.js`, не generated HTML або сумісні exports. Ціни й умови не беруться з payload клієнта. Поля зі статусом pending не стають обіцянками автоматично. Повна схема: [product-configuration.md](docs/product-configuration.md).

## Конфігурація секцій

`PRODUCT_CONFIG.sections`: `hero`, `features`, `scenarios`, `video`, `specifications`, `delivery`, `faq`, `order`; кожна має `enabled` та унікальний числовий `order`. Без Order залежні CTA прибираються; без Hero sticky bar не генерується. Деталі: [reusable-sections.md](docs/reusable-sections.md). Вимкнення секції не відключає серверний API.

## Дизайн-теми

`shared/design-config.js` обирає `pocket-studio`; `shared/design-themes.js` визначає перевірені токени. Структуру CSS редагуйте в `templates/styles.css`. Додаткових тем або visitor switcher немає. [Design themes](docs/design-themes.md).

Після змін конфігурації чи шаблонів:

```sh
npm run sync:product
npm run sync:sales
npm test
npm run check
npm run check:docs
```

Обидва sync entry points виконують одну повну генерацію. Комітьте outputs разом із джерелами. Deployment не запускає генерацію автоматично.

## Telegram integration

Наявна Vercel Function `/api/order` потребує `TELEGRAM_BOT_TOKEN` і `TELEGRAM_CHAT_ID` лише на сервері, у відповідному Vercel environment. Не додавайте значення до Git, frontend або логів. Формат POST: `name`, `phone`, необов'язковий `bot-field`; server-authoritative price — зі shared config. API приймає лише JSON і повертає success тільки після підтвердження Telegram. Автоматичних retries немає. Повний контракт і відмови: [architecture.md](docs/architecture.md); provisioning: [deployment.md](docs/deployment.md).

## Analytics / Consent / UTM

`analytics-config.js` містить публічний measurement ID та точний дозволений production hostname. За замовчуванням згоду не надано: Google tag і маркетингове сховище не активуються. Після згоди надсилаються `page_view`, `view_item`, `order_click`, `begin_checkout`, `generate_lead`; PII форми до них не додаються. UTM приймаються тільки за нейтральною схемою кодів і зберігаються в межах сесії вкладки після згоди.

[Analytics](docs/analytics.md), [UTM і воронка](docs/marketing-attribution.md), [інформація для відвідувача](privacy.html). Enhanced Measurement, destinations, key events і retention у GA4 потребують окремої перевірки власником; код їх не налаштовує.

## Deployment на Vercel

Наявна Git integration публікує `main`; окремий manual deploy не потрібен. Root — корінь репозиторію, framework — Other, статичні outputs у корені та Node Function в `api/`. Не створюйте новий проєкт для звичайного оновлення. Налаштування environments, перевірка deployment і rollback: [deployment.md](docs/deployment.md).

## Security

JSON-only POST, allowlist полів, ліміт 2 KiB, Origin/Fetch Metadata, honeypot, незалежна серверна валідація, no-store, CSP без unsafe-inline/eval та інші security headers. Код не логує заявки чи Telegram token-bearing URLs.

**Розподілений rate limit має забезпечувати Vercel WAF.** `docs/waf-rate-limit.json` — опис рекомендованого правила, не активна конфігурація. Фінальний read-only аудит не отримав доступу до workspace (403), тому enforcement не підтверджено. До рекламного трафіку власник має перевірити правило й безпечний тест 429. [Security](docs/security.md).

## Testing

```sh
npm test
npm run check
npm run check:docs
npm run qa:browser
git diff --check
```

Unit/integration тести мокають Telegram й аналітичний transport. Browser QA потребує зовнішнього Playwright/Chromium і запущеного локального offline dev server; проєкт не встановлює ці залежності. Можна передати `PLAYWRIGHT_MODULE` (абсолютний шлях до Playwright module) та `PLAYWRIGHT_BROWSERS_PATH`. Не обходьте політики середовища.

У поточному середовищі npm launcher заблокований; виконуються еквівалентні команди `node --test tests/*.test.mjs`, `node scripts/check.mjs`, `node scripts/check-links.mjs`, `node scripts/browser-qa.mjs`. Поточні результати, включно з блокуванням browser QA: [release-v2.5.0.md](docs/release-v2.5.0.md). Історичні успішні browser runs не є перевіркою фінального commit.

## Відомі обмеження

- Немає серверної durable idempotency: вкладки, reload і неоднозначні timeout можуть дати дубльовану доставку. Client guards діють лише в межах завантаженої сторінки.
- Надсилання заявки потребує JavaScript. Без JS видно контент і native constraints, але native form POST має URL-encoded формат, який JSON-only API відхиляє. Контракт навмисно не змінено.
- WAF, реальні production headers, GA4 account settings, доступ/retention Telegram й screen reader/фізичні мобільні пристрої потребують ручної перевірки.
- Google Fonts завантажується до аналітичної згоди; privacy/consent реалізація не є юридичною сертифікацією.
- Це обмежений landing kit, не CMS/редактор чи перевірена адаптація під будь-який товар. Нові токени/товари потребують review.
- Фінальний visual QA не підтверджений через недоступність localhost для браузера.

Підтримка й повернення до проєкту: [maintenance.md](docs/maintenance.md). Портфоліо-кейс без вигаданих метрик: [portfolio-case.md](docs/portfolio-case.md). Історія: [CHANGELOG](CHANGELOG.md), [archive](docs/archive/README.md).

## Ліцензія

Код розповсюджується за [MIT License](LICENSE). Права та походження товарних фото/відео слід окремо підтвердити перед стороннім комерційним використанням; наявність MIT для коду не є підтвердженням прав на сторонні медіа.
