# Changelog

## 2.4.0 — Reusable Sections (17.10.2026; візуальна перевірка очікується)

- Декларативні enabled/order для Hero, Features, Scenarios, Video, Specifications, Delivery/Kit, FAQ та Order; строгий whitelist і перевірка унікальності.
- Вісім незалежних renderer-модулів, канонічний HTML-шаблон і спільна детермінована збірка для обох sync-команд. Попередні content-render APIs лишаються сумісними фасадами.
- Без Order немає form/CTA/sticky; без Scenarios немає відповідних посилань; без Hero — доступний fallback H1 і відсутній Hero-dependent sticky bar. Default DOM/контент збережено (очищено лише пробіли на семи порожніх рядках HTML); одна нова CSS utility не змінює стандартний вигляд.
- Усі 163 попередні тести збережено; 23 нові перевіряють конфігурацію, 256 visibility-комбінацій, порядок, залежності, XSS, доступність, repeatability та CLI/check/restore.
- 186 тестів, check і diff whitespace проходять. Browser QA заблоковано середовищем: ERR_NETWORK_ACCESS_DENIED до першого сценарію, без обходу обмежень.
- API/Telegram, GA4/UTM/consent, runtime JS, ціни, контент, фото/відео, CSP та production services незмінні. Не додано theme system, CMS, database, залежності, новий demo mode чи тестову адаптацію іншого товару.


## 2.3.0 — Product Configuration Foundation (17.10.2026; візуальне приймання очікується)

- Централізована валідована immutable product configuration: ідентичність, ціни, переваги, характеристики, медіа, комерційні статуси, сценарії, FAQ, CTA та SEO.
- Сумісні PRODUCT/SALES exports; серверна ціна, analytics product ID, назва та CTA labels беруться з того самого джерела.
- Детерміновані статичні product/sales generators, безпечні HTML/JSON-LD, синхронізація SEO/robots/sitemap/CSP hash без template engine і залежностей.
- 163 unit/integration тести, check і diff whitespace проходять. Browser QA спробовано, але localhost недоступний Chromium (ERR_CONNECTION_TIMED_OUT); це не успішна візуальна перевірка.
- Mini Printer v2.2 HTML/CSS/фото/відео/CSP та затверджені тексти/ціни збережені; pending умови не стали обіцянками. API-контракт і повідомлення для поточного товару незмінні.
- Не повністю універсальний kit: інший товар ще не пройшов наскрізну адаптацію. Режим demo/sales — foundation marker без нового order-flow. Tag v2.3.0 — тільки після візуального приймання.


## 2.2.0 — Premium Experience (16.10.2026)

- Узгоджені motion tokens, кнопки без переміщення при hover, стани active/focus/disabled і pointer-aware hover.
- Плавні стани полів, виразні feedback/loading/error/success на наявній логіці форми.
- Узгоджені деталі H3, внутрішніх відступів карток і текстових посилань.
- Native FAQ із коротким fade відповіді; чотири одноразові reveal заголовків, reduced motion та безпечний fallback без JS/IntersectionObserver/motion-модуля.
- Регресійні unit і браузерні перевірки; без змін Hero, контенту, медіа, sticky-логіки, комерційних даних та інтеграцій.
- Затверджено користувачем до публікації. Детальний QA — [release-v2.2.0.md](docs/release-v2.2.0.md).

## 2.1.0 — Sales Experience

- Покращені mobile Hero, Header, сценарії використання, відеосекція, доставка/комплектація, п’ять FAQ та безпечні режими відгуків.
- База Premium Experience: `94b521242b32841b5a81cb72b0f4d026f51ddc18`.
- Історичний звіт — [release-v2.1.0.md](docs/release-v2.1.0.md).
