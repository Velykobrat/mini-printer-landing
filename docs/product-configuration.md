# Product Configuration Foundation — v2.3.0

Єдине джерело продуктових даних: **shared/product-config.js**. Конфігурація перевіряється під час імпорту через shared/product-config-validation.js і рекурсивно заморожується. Немає CMS, template engine, build framework, сховища чи нових npm-залежностей. Це foundation, а не підтверджено універсальний Product Landing Kit.

## Структура та обов’язкові дані

| Поле | Призначення |
| --- | --- |
| mode | sales або demo; metadata майбутнього режиму, зараз не вимикає форму/API/аналітику й не публікує demo-відгуки |
| product | id, analyticsId, name, shortDescription (Hero), description (повний опис/JSON-LD) |
| pricing | price > 0, referencePrice >= price, трилітерна currency, currencyLabel для відображення/повідомлення |
| benefits | Чотири title/text у чинних чотирьох icon slots |
| specifications | Непорожній список label/value |
| media | Hero src/alt/width/height; video status/src/poster/width/height |
| scenarios | title/text/image/alt/width/height для фото сценаріїв |
| commerce | delivery, terms і kit; підтверджені та pending факти залишаються розділеними |
| faq | Пари запитання/відповідь |
| cta | Header, Hero, secondary, orderTitle, submit, loading, sticky labels |
| copy | Затверджені Hero/feature/video headings, текст відео/fallback, заголовки sales-секцій і примітка комплектації |
| seo | title, description, socialDescription, HTTPS canonical без credentials/query/hash із завершальним slash, local image та alt/dimensions |

Не редагуйте PRODUCT/SALES facades напряму: shared/product.js і shared/sales-content.js експортують сумісні об’єкти з конфігурації. price/currency/name залишаються серверними даними; браузер не надсилає ціну в /api/order. Analytics ID збережено як mini_printer, item_id як mini-printer. Жодних подій або PII-полів не додано. Поточний Telegram headline/price рядок генерується з name/currencyLabel і для Mini Printer залишається ідентичним.

### Факти та статуси

Не переводьте pending в confirmed без перевірених комерційних даних. За замовчуванням післяплата, оплата карткою, безкоштовна доставка, термін відправлення, гарантія й склад комплекту лишаються pending; підтверджене відео — confirmed. Pending terms/items не публікуються навіть за наявності text. Точні умови, як і раніше, уточнює менеджер. Відгуки лишаються окремим підтвердженим/локальним demo-механізмом; product.mode не обходить його hostname/status обмеження.

## Генерація

```sh
npm run sync:product
npm run sync:sales
npm test
npm run check
npm run qa:browser
git diff --check
```

Якщо npm launcher заблоковано, еквіваленти: node scripts/sync-product.mjs, node scripts/sync-sales.mjs, node --test tests/*.test.mjs, node scripts/check.mjs, node scripts/browser-qa.mjs. Browser QA потребує доступного Playwright і локального dev server (node scripts/dev.mjs); PLAYWRIGHT_MODULE/BROWSER_EXECUTABLE дозволяють використати наявне зовнішнє QA-середовище без залежностей сайту. API локального dev server offline; browser suite перехоплює order requests. Не запускайте реальні Telegram заявки для автотестів.

sync:product синхронізує цінові slots, ім’я/контент Hero, переваги, характеристики, CTA, локальне Hero-фото, title/meta/canonical/Open Graph/Twitter, Product JSON-LD, robots/sitemap і CSP hash. sync:sales використовує ті самі дані для сценаріїв, відео, delivery/kit і FAQ. scripts/check.mjs уже викликає обидва генератори з --check; drift завершує перевірку з помилкою.

Порядок product/sales не впливає на результат: вони володіють окремими слотами. Генератори — maintenance-команди, а не клієнтський рендеринг. Повторний запуск не створює змін. Тексти/атрибути екрануються, JSON-LD екранує < > & та line separators, медіа дозволені лише в локальному ./images з відповідними розширеннями, dimensions — додатні цілі. Довільний HTML у конфігурації не виконується; розриви рядків і SVG належать схваленій HTML-структурі. Missing/ambiguous slots дають помилку замість мовчазної генерації.

Не редагуйте згенеровані значення або CSP hash вручну. Перегляньте diff; зміни політик CSP, env vars, origin/hostnames, WAF і GA4 measurement settings потребують окремого platform review. Генератор змінює в vercel.json лише Product JSON-LD hash; з поточною конфігурацією vercel.json не змінюється взагалі.

## Перевірка проти v2.2.0

Точка повернення збережена без переписування історії: tag v2.2.0 → 73008ebb61925edee4990a351fcb890b05cd2648. Нового v2.3.0 tag до візуального приймання немає.

- База: 141 тест. Після foundation: **163 тести**, включно з validation, static price/schema/SEO, XSS/JSON-LD/replacement tokens, pending gates, missing slots, повторюваністю та всіма попередніми API/form/analytics/consent/UTM/sticky/motion перевірками.
- Обидва --check й повний scripts/check.mjs проходять. Повторна генерація дає ті самі HTML/SEO/CSP; з Mini Printer config index.html, styles.css, robots.txt, sitemap.xml, vercel.json і медіа залишаються ідентичними v2.2.0. Структура, IDs/classes/selectors, ціна 800/1200 UAH і тексти не змінені.
- git diff --check проходить. Чотири старі docs-файли показували newline-only modifications одразу після чистого clone через наявні .gitattributes; вони не включаються в commit foundation.
- Browser QA **спробовано, але не пройдено через середовище**: Chromium Headless Shell запущено через зовнішній Playwright, page.goto localhost:4173 повернув ERR_CONNECTION_TIMED_OUT до першого сценарію. Тому немає нового підтвердженого screenshot/viewport/no-JS/keyboard/video review. Наявний звіт v2.2 не видається за перевірку v2.3.
- Production GA4/CSP/WAF/Telegram і фізичні мобільні пристрої не перевірялись. Новий code/config не змінює production env або service settings.

Перед візуальним прийманням на Vercel перевірте 320/375/390/430/768/1024/1440px, Hero/відео, FAQ, навігацію, sticky bar, форму loading/error/success, consent/withdrawal і no-JS content. Будь-який API smoke test — лише з окремо дозволеним test chat. Не створюйте release tag на підставі лише unit-тестів.

## Що ще специфічне для Mini Printer

Чинна композиція, чотири SVG benefit icons, дворядкові заголовки, uk-UA мова/локаль, назви секцій загального шаблону, emoji й часовий пояс Telegram, UI текст валідації/згоди, demo-review приклади та privacy copy не стали універсальною темою. GA4 measurement ID/canonical allowlist і UTM mp-* taxonomy лишаються deployment/marketing конфігурацією, не автоматично переписуються при зміні товару. Потрібно окремо перевірити їх для нового домену/товару.

mode зараз лише поле foundation: реальний demo checkout, multi-product routing, theme system, CMS, database, нові секції або інший order flow не реалізовані. Підтримка іншої валюти/товару в rendering smoke test не є повною адаптацією. Наступний етап — за окремим завданням адаптувати другий фізичний товар у контрольованій гілці й перевірити SEO, контент, UI, pricing/API та marketing taxonomy наскрізно. До цього не називайте kit повністю універсальним.
