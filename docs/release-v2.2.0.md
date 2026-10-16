# Mini Printer v2.2.0 — Premium Experience

Затверджений до релізу, 16.10.2026. База — чиста `main` на стабільній v2.1.0, `94b521242b32841b5a81cb72b0f4d026f51ddc18`. Робоча копія: Codex `work/mini-printer-landing`; зміни не переносилися до окремого клону в Documents/GitHub. Версію пакета піднято до `2.2.0`. Користувач окремо дозволив релізний commit, звичайний push до синхронізованої main та анотований tag v2.2.0. Окремий manual deploy не виконується; Git integration Vercel може запустити deployment після push.

## Реалізовані покращення

| Зміна | Підтверджена проблема / призначення |
| --- | --- |
| Motion tokens: 140/220/320 мс, спільний easing | Замість розрізнених тривалостей та миттєвих переходів — одна зрозуміла система |
| Кнопки без translate при hover | У v2.1.0 CTA зміщувалася на 2 px навіть при reduced motion; тепер hover/active не змінюють геометрію |
| Hover лише для точного курсора | На touch немає залежності від hover або завислого hover-ефекту |
| Active, disabled та keyboard focus | Натискання позначає колір/внутрішня рамка; focus залишається виразним, disabled не отримує hover |
| Transitions полів | Короткі переходи кольору рамки, фону та focus ring без зміни розмірів input |
| Feedback форми | Наявні aria-busy/disabled керують progress-станом; error/success мають спокійні підкладки та рамки, без нових повідомлень чи змін submission |
| H3 та внутрішні відступи | Спільний tracking, line-height і ритм заголовків; padding карток доставки узгоджено з картками сценаріїв, компактні варіанти збережені |
| Текстові посилання | Узгоджені hover/active/focus та underline без зміни геометрії Header |

Форма зберігає всю валідацію, тексти, aria-live, focus першої помилки, loading lock, обробку 503/200 та payload. На нових підкладках контраст тексту success ≈4.87:1, error ≈5.93:1.

## Conditional scope

**FAQ включено в мінімальному варіанті.** Залишено native details/summary, Enter і роботу без JS. Відкрита відповідь має fade 140 мс від opacity .9 до 1. Контент доступний одразу; закриття нативне. Анімацію висоти відхилено: вона додала б ризик проміжних компонувань, clipping і складніших fallback без достатньої користі.

**Scroll reveal включено лише для чотирьох заголовків:** features, scenarios, відео та delivery. IntersectionObserver запускає CSS fade .9→1 і translateY(8px)→0 на 320 мс, після чого елемент більше не спостерігається. Анімація не повторюється при поверненні. Немає opacity:0, hidden/pending-класів, таймерів для розкриття контенту, постійних scroll listeners або stagger. Картки, Hero, ціна, CTA, FAQ та форма не отримують reveal.

`experience.js` підключається через dynamic import після запуску основних функцій. Невдала доставка модуля або IntersectionObserver не блокують навігацію та форму. Нові runtime-залежності або animation libraries відсутні.

## Reduced motion і доступність

- При початковому reduced motion observer не створюється. При зміні переваги під час сесії observer від’єднується, активні reveal-класи видаляються; автоматичного повторного запуску ефектів немає.
- CSS окремо обмежує reveal і FAQ fade до no-preference, а reduced motion прибирає ці анімації й майже миттєво завершує transitions. Нативний smooth scroll відключається, як і раніше.
- Без JS заголовки, фотографії та весь контент видимі; FAQ працює з клавіатури. Надсилання форми, як і у v2.1.0, потребує JS і має наявне noscript-пояснення.
- Збережені видимі focus outlines. Заголовок із фокусом усередині не анімується. Non-interactive cards не отримали hover/active, cursor:pointer чи інтерактивної elevation.

## Що залишено без змін

HTML і структура сторінки, Hero та його mobile-порядок, усі фотографії/відео/poster, тексти, ціни/знижки/комплект/гарантійні умови, Product schema, SEO, Telegram API, GA4/UTM/consent, Vercel/CSP/security headers. У script.js додано лише ізольоване асинхронне підключення experience.js; наявні form/anchor/sticky функції не змінювалися. Sticky-пороги −16 px / 128 px / 180 мс збережені; анімацію самої панелі не додано.

## Перевірки

- `npm test`: **141 passed, 0 failed** — 136 існуючих тестів збережено, додано 5 регресійних тестів reveal/fallback/reduced-motion/focus і контрасту fade. Існуючі тести не послаблювалися.
- `npm run check`: **PASS**; додано підтримку перевірки literal dynamic imports поряд зі static imports.
- `git diff --check`: **PASS**.
- `npm run qa:browser`: **PASS** у локальному headless Google Chrome. Existing QA збережено й розширено через scripts/premium-qa.mjs.
- Ширини: **320, 375, 390, 430, 681, 768, 1024, 1280, 1440, 1920 px** — без горизонтального overflow; Header, Hero-порядок, CTA та video alignment пройшли перевірки.
- Sticky на **375/390 px**: top, passed CTA, stable reveal, near form, focus, blur, return top — PASS. CTA/keyboard FAQ, mock API 503/200, video preload/play/seek і production-demo gate — PASS; реальні Telegram-запити не надсилалися.
- Desktop hover і active не переміщують CTA; keyboard outline видимий. Reveal запускається один раз; Hero/картки/order не анімуються.
- Reduced motion перевірено при завантаженні та при зміні під час сесії. No-JS — **320/390/1440 px**; touch-емуляція Chrome — **390 px**. Окремо замокано відмову завантаження experience.js: контент, навігація та client validation працюють.
- Локальний PerformanceObserver у перевіреному Chrome-сценарії: **initial layout shift = 0; repeated-reveal scroll layout shift = 0**. Це контрольоване локальне спостереження, не польові Core Web Vitals і не повний Lighthouse-звіт.
- JS runtime errors у виконаних сценаріях: **0**. Desktop/mobile та валідаційний стан форми переглянуто на скриншотах.

Нова frontend-логіка — невеликий experience.js (приблизно 1.4 KB source, 0.6 KB gzip у локальному вимірюванні). CSS виріс приблизно на 3.3 KB source. Нових медіа, зовнішніх бібліотек і font requests не додано. Hero не анімується й не очікує завершення ефектів. Модуль не є залежністю відправлення заявки.

## Відкладено та межі перевірки

Optional 12–14 не реалізовано: stagger, вступна анімація Hero та анімація sticky-панелі. Також немає hover на інформаційних картках, паралаксу, scroll-jacking, animation-height FAQ або перероблення навігації/форми.

Firefox і WebKit не встановлені в доступному Playwright-середовищі; їхні тести не запускалися. Не перевірено фізичні iOS/Android, мобільну клавіатуру та screen reader. Touch-емуляція не замінює ці перевірки. Не виконано production QA CSP/GA4/WAF/Telegram, комерційні або маркетингові вимірювання — товару фізично немає. Польові LCP/INP/CLS та мережі реальних користувачів не вимірювалися.

## Файли та наступний крок

Змінено: styles.css, script.js, scripts/check.mjs, scripts/browser-qa.mjs, package.json, README.md, docs/QA.md.
Створено: experience.js, tests/experience.test.mjs, scripts/premium-qa.mjs, docs/release-v2.2.0.md, CHANGELOG.md.

Локальне користувацьке review завершено: 16.10.2026 отримано дозвіл на публікацію. Для v2.3.0 — повторюваний Firefox/WebKit QA, реальні мобільні пристрої та screen-reader review, performance budget на різних мережах. Нові ефекти розглядати лише після цього, без додавання анімацій заради їх кількості.
