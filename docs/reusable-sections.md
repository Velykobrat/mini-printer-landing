# v2.4.0 — Reusable Sections

База — актуальний main v2.3.0, commit `2d02d99a0ee053842e8102dfd86365adfda3a9e7`. Mini Printer залишається демонстраційним товаром. Це керування поточними секціями, не повністю універсальний framework, тема чи новий demo mode.

## Як налаштувати

`shared/product-config.js` містить `sections: DEFAULT_SECTIONS`; defaults та валідація — у `shared/section-config.js`. Для окремої конфігурації замініть sections на повний масив із цих восьми записів:

```js
sections: [
  { id: 'hero',           enabled: true, order: 10 },
  { id: 'features',       enabled: true, order: 20 },
  { id: 'scenarios',      enabled: true, order: 30 },
  { id: 'video',          enabled: true, order: 40 },
  { id: 'specifications', enabled: true, order: 50 },
  { id: 'delivery',       enabled: true, order: 60 },
  { id: 'faq',            enabled: true, order: 70 },
  { id: 'order',          enabled: true, order: 80 },
],
```

Порядок визначає **числове поле order**, а не позиція запису в масиві. Значення — унікальні цілі 0–1000, включно з вимкненими секціями, щоб повторне ввімкнення було однозначним. enabled — лише boolean. Усі вісім id мають бути присутні рівно один раз. Невідомі id, зайві поля (наприклад html або module), дублікати, fractional/string orders та небезпечні module paths відхиляються. Наприклад, video.order=15 поставить його між Hero і Features; video.enabled=false вимкне лише Video, незалежно від Scenarios.

Контент і далі налаштовується в Product Configuration Foundation. Вимкнення секції не скасовує перевірку її конфігурації: дані зберігаються валідними для відновлення. Статуси pending/confirmed, ціни, тексти та медіа автоматично не змінюються.

## Генерація та модулі

```sh
npm run sync:product
npm run sync:sales
npm test
npm run check
git diff --check
```

За заблокованого npm launcher використовуйте прямі Node-команди з package scripts. Для browser QA: локальний `node scripts/dev.mjs`, потім `node scripts/browser-qa.mjs` у доступному Playwright-середовищі.

Обидві sync-команди викликають `scripts/sync-landing.mjs`: повну однакову збірку HTML, SEO, JSON-LD/CSP hash, robots/sitemap. Черговість команд не впливає на результат. --check тільки перевіряє drift. Видимий контент лишається статичним і не залежить від JS.

- `templates/page.html` — канонічний схвалений HTML-каркас v2.3 з наявними classes/IDs/ARIA та структурними маркерами. Це source layout, не ще одна конфігурація фактичних продуктових даних. Згенерований index.html не є джерелом для відновлення вимкнених секцій.
- `scripts/sections/hero.mjs`, features, scenarios, video, specifications, delivery, faq, order — незалежні невеликі renderer-функції. Hero/Features/Specifications/Order використовують схвалені HTML-фрагменти, sales-модулі будують власні невеликі блоки. Загальні price/escaping helpers не приймають довільний markup із конфігурації.
- `scripts/document-render.mjs` відповідає за shell/SEO/JSON-LD. Старі renderProduct/renderSales лишаються тонкими compatibility content-фасадами для наявних 163 тестів; для configured layout використовуйте спільну landing-збірку.
- `scripts/landing-render.mjs` збирає наявний контент, вибирає та впорядковує approved sections, прибирає неробочі actions і перевіряє IDs/anchors/ARIA/H1. Селектори та module imports фіксовані в коді; конфігурація не може завантажити довільний код.

Повторне ввімкнення секції відновлює її зі source template, навіть якщо поточний output її вже не містить. За default-layout структура, контент і маркери HTML v2.3 збережені; лише пробіли на семи порожніх рядках очищено для git diff --check. Це не змінює DOM-елементи або відображення. Для зміненого порядку зовнішній whitespace/comments main нормалізуються; DOM секцій, їхні класи/IDs/ARIA і контент зберігаються. Не додавайте nested section-теги до цього малого фіксованого каркаса без окремої зміни parser/registry та тестів. Це не general-purpose HTML/template engine.

## Залежності

| Секція вимкнена | Результат |
| --- | --- |
| Hero | Немає Hero CTA та sticky bar, який залежить від спостереження Hero CTA. У main є escaped H1 з `.visually-hidden`; Header CTA залишається, якщо Order увімкнений |
| Features | Немає секції та її reveal target; інші секції незалежні |
| Scenarios | Немає Header/secondary Hero посилань на #scenarios; Video може лишитися |
| Video | Немає video/source/poster/video-note block; Scenarios може лишитися |
| Specifications | Немає #specs; інші секції незалежні |
| Delivery/Kit | Немає блоку та Header посилання на #delivery |
| FAQ | Немає FAQ/details; інші секції незалежні |
| Order | Немає форми, Header/Hero order CTA, #order links чи sticky bar. Наявні runtime guards не створюють form/order-click handlers для відсутнього target |

За одного Header nav link прибирається декоративний роздільник; за відсутності обох — весь порожній nav. Hero actions wrapper прибирається, якщо обидва actions відсутні. Review shell не є новою configurable секцією: він зберігається перед Order, або наприкінці main, якщо Order вимкнений; його попередні confirmed/demo/hostname rules не змінені.

Не змінюється поведінка initOrderForm/initOrderNavigation/initStickyOrder/initScrollReveal: вони вже мають missing-element guards. Усі існуючі runtime JS файли, API, GA4/UTM/consent і security config збережені. З вимкненим Order сторінка не надсилає checkout/lead через відсутню форму; page_view/view_item лишаються допустимими незалежними подіями зі згодою. Вимкнення секції — **не** shutdown API або новий demo-order режим; endpoint навмисно не змінюється.

Якщо Order пересунуто перед Hero, збережений JS використовує фактичну геометрію секцій, а не індекси. Якщо Hero немає, sticky fail-closed прибрано під час генерації. Це не додає нових order-кнопок або іншої логіки збору заявок.

## Перевірки та межі

- **186 тестів**: усі 163 попередні файли/сценарії збережені, 23 нові тести охоплюють strict schema, всі 256 visibility-масок, перестановки, єдині IDs/H1, anchors/ARIA, missing Order runtime guards, XSS/status gates, стабільний JSON-LD/CSP hash та повторюваність CLI. Тимчасова копія проходить повний check з усіма секціями off і відновлюється до точного згенерованого default HTML.
- `node scripts/check.mjs` і `git diff --check` проходять. Check став section-aware: він не вимагає форми/Hero/lazy images, якщо відповідну секцію вимкнено, але завжди перевіряє цілісність IDs/anchors/ARIA/H1 та обидва sync outputs.
- Default index.html і canonical template збігаються з v2.3 після нормалізації пробілів на порожніх рядках. Класи, IDs, content, медіа, ціни, API/GA4/UTM/CSP/production settings не змінені. Єдина нова CSS utility використовується лише за відсутнього Hero й не впливає на default layout.
- Browser QA **запущено, але не пройдено**: Chromium отримав `ERR_NETWORK_ACCESS_DENIED` на http://127.0.0.1:4173 до першого сценарію. Системні обмеження не обходилися. Немає нового підтвердженого responsive/screenshot/keyboard/no-JS/video/реального браузерного scroll review.
- Node 24 у робочому середовищі, engine 22.x збережено; нових npm dependencies немає. Локальний dev server offline, API unit/browser mocks не надсилають реальні Telegram заявки. Production GA4/Firewall/Telegram не тестувалися.

На Vercel вручну перевірте default layout на 320/375/390/430/768/1024/1440px і контрольовані варіанти: без Hero, без Order, без Scenarios, Video перед Scenarios, Order перед Hero. Варіанти не слід публікувати в main лише заради тесту — спершу окрема preview-ревізія. Перевірте CTA/scroll/sticky, клавіатуру, no-JS content та consent. Не вважайте статичну матрицю доказом браузерної геометрії.

Не додано theme system, нових режимів, CMS/БД, dependencies, секцій або іншого товару. Повноцінний demo mode й тестова адаптація іншого продукту залишаються окремими майбутніми завданнями, не виконані цією версією. Нових release tags чи manual deployment немає; дозволена публікація використовує чинну Vercel Git integration.
