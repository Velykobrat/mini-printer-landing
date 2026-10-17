## v2.5.0 — Design Themes

Незалежний вибір теми в `shared/design-config.js`, строгий реєстр токенів і статична генерація `styles.css` з `templates/styles.css`. Єдина тема `pocket-studio` відтворює чинний дизайн. Інструкція: [docs/design-themes.md](../design-themes.md). Після редагування теми запускайте sync:product або sync:sales, потім тести/check.

222 тести (186 попередніх + 36 нових). Статична еквівалентність CSS підтверджена; browser QA не пройдено через ERR_CONNECTION_TIMED_OUT на localhost, візуальне приймання очікується. HTML/контент, API/Telegram, GA4/UTM/consent і CSP збережені. Додаткових тем, залежностей, visitor switcher і release tag немає.

## v2.4.0 — Reusable Sections

Порядок і видимість восьми секцій налаштовуються через `PRODUCT_CONFIG.sections` (`id`, `enabled`, `order`). Інструкція та залежності: [docs/reusable-sections.md](../reusable-sections.md).

Обидві команди `sync:product` і `sync:sales` тепер збирають усю сторінку з канонічного `templates/page.html` та незалежних модулів `scripts/sections/`. За замовчуванням DOM і контент збігаються з v2.3; очищено лише пробіли на семи порожніх рядках HTML. Вимкнені Order/Scenarios прибирають залежні CTA/посилання; без Hero sticky bar не генерується, додається доступний невидимий H1. API, Telegram, GA4, UTM і комерційні умови не змінюються.

186 тестів і статичні перевірки проходять. Browser QA спробовано, але Chromium отримав `ERR_NETWORK_ACCESS_DENIED` на localhost; візуальний QA не підтверджено. Нових залежностей, тем, demo-order flow, адаптації іншого товару або release tag не додано.

## v2.3.0 — Product Configuration Foundation

Товар налаштовується в `shared/product-config.js`. Це перший етап Product Landing Kit від BeBetter Development, а не повністю універсальний конструктор. Інструкція, обов'язкові поля та межі адаптації: [docs/product-configuration.md](../product-configuration.md).

Після редагування запускайте `npm run sync:product`, `npm run sync:sales`, потім `npm test` і `npm run check`. Видимий контент залишається статичним HTML. `shared/product.js` і `shared/sales-content.js` тепер є сумісними експортами з конфігурації; старі інструкції редагувати ці файли напряму замінені цим правилом.

Baseline — стабільний tag `v2.2.0`, commit `73008ebb61925edee4990a351fcb890b05cd2648`. Tag v2.3.0 не створюється до візуального приймання. Окремий manual deploy не виконується; після дозволеного push працює наявна Git integration Vercel.

# Mini Printer v2.2.0 — Premium Experience

Україномовний лендінг портативного термопринтера. Збережено візуальний напрям Pocket Studio, HTML/CSS/vanilla JavaScript і Vercel Node.js Function із Telegram Bot API. Немає frontend-фреймворку, бази даних, сторонніх npm-залежностей або обов’язкового build-кроку.

**v2.2.0 — Premium Experience**, затверджено до релізу 16.10.2026. База — стабільна v2.1.0 / `94b5212`, версія пакета — `2.2.0`. Публікація — релізний коміт і анотований Git tag `v2.2.0`; фактичний статус deployment перевіряється окремо. Зміни й QA: [release-v2.2.0.md](release-v2.2.0.md), коротко — [CHANGELOG.md](../../CHANGELOG.md). Історія v2.1.0: [release-v2.1.0.md](release-v2.1.0.md).

## Локальний запуск

Потрібен Node.js 22.x. Встановлювати залежності не потрібно.

```sh
npm run dev
```

Відкрийте `http://localhost:4173`. ES-модулі потребують HTTP-сервера; `file://` не підтримується. Локальний сервер свідомо використовує порожнє оточення API: валідна заявка поверне 503, **реальні повідомлення не надсилаються**. Для перевірок інтеграції використовуйте окремий контрольований Vercel preview. Не відкривайте секрети в браузері, файлах або логах.

```sh
npm test
npm run check
```

Якщо Windows блокує npm scripts через вимкнений `cmd.exe`, запускайте еквіваленти напряму:

```sh
node scripts/dev.mjs
node --test tests/*.test.mjs
node scripts/check.mjs
node scripts/sync-product.mjs
```

Тести використовують `node:test` і моки Telegram/DOM. Вони не замінюють браузерну або production-перевірку. `check` перевіряє синтаксис, модулі, anchors, локальні файли, відповідність цін/schema/CSP і відомий формат Telegram-токена. Це не повний security scanner чи HTML validator.

## Vercel

- Збережіть наявний Vercel project та зв’язок із репозиторієм. Framework preset: Other; root: repository root; frontend build/output overrides не потрібні. Сайт обслуговується як статичні файли, `/api/order` — Node.js Function.
- `package.json` фіксує Node.js 22.x. `vercel.json` задає максимум функції 15 секунд; Telegram має окремий таймаут 8 секунд, клієнт — 12 секунд.
- Налаштуйте незмінені server-only змінні `TELEGRAM_BOT_TOKEN` та `TELEGRAM_CHAT_ID` для потрібного середовища. Значень у репозиторії немає. Preview повинен використовувати окремий тестовий чат, якщо дозволена ручна інтеграційна перевірка.
- Додайте правило WAF із [security.md](../security.md) **до приймання рекламного трафіку**. Конфігурація в репозиторії не активує обмеження запитів сама.
- Перевірте фактичну canonical-адресу. Зараз збережено `https://mini-printer-landing.vercel.app/`; при зміні домену оновіть canonical, OG URL/image, Twitter image, robots і sitemap, потім запустіть `npm run sync:product`.
- Security headers включають CSP із дозволом власних скриптів, Google Fonts, hash JSON-LD і вузьких GA4 origins (завантаження лише після згоди). У preview перевірте, чи він сумісний із Vercel Toolbar/зовнішніми інтеграціями. Не послаблюйте CSP до `unsafe-inline`; додайте лише потрібні джерела після перевірки.
- Локальні зміни публікуються лише після окремого дозволу користувача. Git integration Vercel може створити preview після push; це залежить від наявних налаштувань проєкту.

## Заявка

1. Клієнт перевіряє ім’я (2–60 символів) і нормалізує телефон. Український `0XX…` або `380XX…` стає `+380XX…`; міжнародні номери приймаються з `+`, 10–15 цифр. Це перевірка формату, не фактичного володіння номером.
2. JSON із `name`, `phone` і `bot-field` надсилається на `/api/order`. Клієнт не надсилає ціну.
3. Сервер незалежно перевіряє method, origin для браузерів, Content-Type, розмір (2 KiB), структуру, типи полів і honeypot.
4. Telegram отримує plain-text повідомлення з авторитетною серверною ціною зі `shared/product.js`.
5. Успіх повертається лише після HTTP success, `ok: true` і підтвердженого `message_id` Telegram. Клієнт очищує форму й може передати `generate_lead` лише після `success: true`.

Неуспішні заявки зберігають поля. Подвійний клік і повтор тієї самої успішної заявки блокуються в межах поточної сторінки. Серверні помилки не повертають токени, upstream response або персональні дані. Немає логування customer data.

**Таймаут є неоднозначним:** Telegram міг прийняти повідомлення до втрати відповіді. Автоматичних retries немає. Гарантії exactly-once, дедуплікації між вкладками чи розподіленими інстансами немає; для неї потрібне надійне сховище ідентифікаторів, яке тут свідомо не додається.

## Ціни

`shared/product.js` — єдине місце редагування ціни: 800 UAH, reference 1200 UAH. Сервер та JS імпортують його. Видимі HTML-значення залишаються статичними для SEO/роботи без JS:

```sh
npm run sync:product
npm run check
```

Скрипт синхронізує `data-price`, Product JSON-LD та CSP hash. Результат треба закомітити. Це maintenance-крок при зміні ціни, а не frontend build. `check` виявляє розбіжності. Не редагуйте ціни в HTML окремо.

## GA4 і згода

UTM та воронка: [docs/marketing-attribution.md](../marketing-attribution.md). Після згоди sessionStorage зберігає перший перевірений UTM-перехід вкладки; native campaign_* додаються до наявних funnel events. Довільні текстові значення не приймаються: для майбутніх Instagram/Facebook/TikTok/Google Ads кампаній використовуйте нейтральний формат кодів і безпечні приклади з документації. Відкликання очищує attribution. Нових conversion/session подій, Ads-функцій чи змін дизайну немає.

GA4 ID: `G-WHL8RKEGFJ`. Google tag завантажується лише після явної згоди або збереженого чинного дозволу (180 днів), лише на `mini-printer-landing.vercel.app`. До згоди й після відмови немає Google tag / collect запитів. При недоступному localStorage — без аналітики. Вибір можна змінити через «Налаштування cookies» у footer; відкликання негайно встановлює Google opt-out і видаляє доступні first-party GA cookies. Замовлення не залежить від аналітики.

Події: `order_click` (реальне CTA, location header/hero/sticky_bar), `begin_checkout` (раз на спробу взаємодії), `generate_lead` (лише після нового підтвердженого успіху API), а також збережений `view_item` і один `page_view` після згоди. Ціна імпортується зі спільної конфігурації. Імена/телефони/значення полів у payload не передаються; `purchase` немає.

**До ввімкнення в production:** вимкніть Enhanced Measurement для web stream, перевірте Google tag destinations та виконайте ручний Network/DebugView QA. Код не може змінити ці налаштування GA4. Повний опис payload, key event, CSP, обмежень та checklist — [docs/analytics.md](../analytics.md). Інформація для відвідувача — [privacy.html](../../privacy.html).

GA4/consent та UTM/funnel уже входять до main після PR #8 і #9. Production collection, GA4 account settings і фактичний WAF залишаються неперевіреними; локальні Sales Trust зміни їх не змінюють.

## Доступність, швидкість, SEO

Збережено Manrope з `display=swap`, локальні справжні JPEG (hero ~40 KB, lifestyle ~137 KB), priority hero й lazy-loading lifestyle. Вказано фактичні розміри 630×630. Перекодування цих невеликих фото не виконувалось, щоб не погіршити якість.

CSS очищено від старих gallery/variant selectors та накладених override-блоків. Основні точки адаптації — 950, 900 і 680 px; desktop-навігація діє від 681 px, а верхнє вирівнювання тексту відео — від 1200 px. Збережено кольори, композицію, hover/reduced-motion; дрібний текст збільшено, звичайний текст — переважно 16px. Додано field errors/aria-invalid, keyboard focus для FAQ, touch targets і запас під mobile bar. Sticky bar ховається перед формою та при фокусі в ній.

Є canonical, Open Graph, Twitter metadata, robots/sitemap і Product/Offer JSON-LD без вигаданих review, stock, доставки, гарантій або рейтингу. Валідність rich-result eligibility і індексацію потрібно перевірити окремо.

## Статус і межі перевірки

Реалізовано hardening, GA4/consent, UTM/funnel і локальні Sales Trust компоненти. Наявність коду й успішні автотести не підтверджують production readiness. Див. [QA.md](QA.md) і [security.md](../security.md). Локальний headless Chrome перевірено на 320–1920 px, включно зі sticky-панеллю 375/390 px, FAQ з клавіатури та замоканою формою. Screen reader, фізичні мобільні пристрої, реальна Vercel Function і Telegram integration залишаються неперевіреними. Не додавайте рекламні обіцянки, непідтверджені гарантії чи вигадані відгуки.

## Sales Content Management

Джерело комерційного контенту — `shared/sales-content.js`; ціни залишаються в `shared/product.js`. Після зміни доставки, оплати, комплектації, lifestyle, відео або FAQ виконайте `npm run sync:sales`, потім `npm run check`. HTML генерується статично в позначені slots: контент доступний без JS; `check` виявляє розбіжності. Не редагуйте ці slots вручну.

- `SALES.delivery` і `SALES.terms`: публікуються лише записи `status: 'confirmed'` із непорожнім текстом. Післяплата, картка, безкоштовна доставка, термін відправлення й гарантія — `pending`, приховані до підтвердження власником.
- `SALES.kit`: зараз `pending`, показується нейтральне пояснення. Для підтвердженого комплекту встановіть `status: 'confirmed'`, додайте `items: [{ status: 'confirmed', text: 'Підтверджена позиція' }]`.
- `SALES.faq`: редагуйте наявні п’ять пар питання/відповідь, зберігаючи рівно 5 запитань і перевірені факти.
- `SALES.lifestyles`: локальні JPG/WebP/AVIF у `images/`, змістовний `alt`; зараз квадратні фото 630×630. Об’єднана секція #scenarios містить дві картки: mini-printer-minion для спогадів/нотаток і mini-printer-use для організації. Кожне фото показується один раз. Для іншої пропорції змініть dimensions у `scripts/sync-sales.mjs`.
- `SALES.video`: локальний файл, перевірений зміст, `status: 'confirmed'`, `src`, локальний `poster` і фактичні `width/height`. Історія та результат перевірки медіа — `docs/sales-trust.md`. Компонент використовує controls, playsinline, preload=none; без autoplay.
- `REVIEWS`: production за замовчуванням; лише записи з `confirmed: true`, непорожніми `author` та `text`, після перевірки справжності й згоди автора на публікацію. Порожня секція прихована. Відгуки не потрапляють у JSON-LD/рейтинги.
- Локальний demo: `http://localhost:4173/?reviews=demo` або `http://127.0.0.1:4173/?reviews=demo`. Три картки мають помітне попередження; на зовнішніх hostname demo примусово вимкнений. Не додавайте реальні персональні дані до demo.

## Реалізовано, перевірено, очікує QA

- **Реалізовано:** серверне приймання заявки через Telegram, спільна ціна/валідація, мобільний CTA, GA4 за згодою, очищення UTM, доставка/оплата, комплектація, lifestyle, медіакомпонент, п’ять FAQ і два режими відгуків.
- **Автоматичні перевірки:** `npm test` — node:test для API/DOM/GA4/UTM та sales/review режимів; `npm run check` — синтаксис, статичні ресурси, anchors, ціни/schema/CSP і sales sync. Обробка CRLF виправлена; `.gitattributes` задає LF для вихідного коду. Поточний звіт — `docs/release-v2.1.0.md`; `docs/sales-trust.md` зберігає попередні етапи.
- **Ручний QA:** підтвердити зміст продажів, реальний вигляд на власному телефоні, screen reader, Vercel headers/WAF/env, GA4 Network/DebugView та інтеграцію з тестовим Telegram. Ранні QA-документи зберігаються як історичні звіти з тодішніми результатами й обмеженнями.

## UX v2.1.0

- Desktop Header: Mini Printer ліворуч, текстові «Можливості» → `#scenarios`, «Доставка» → `#delivery` і єдина синя CTA «Замовити ↗» → `#order` разом праворуч. Ціна є в Hero; мобільний Header зберігає ціну/знижку.
- На mobile (до 680 px): заголовок → опис → наявне фото принтера → ціна → CTA → посилання на сценарії. Одне фото в HTML, порядок задає CSS. Desktop Hero збережено.
- Одна секція сценаріїв із двома різними фото; характеристики компактні, зайвий блок «Про продукт» видалено. FAQ — рівно п’ять запитань.
- ВІДЕООГЛЯД: `Mini Printer.` / `Маленький принтер.`, єдиний опис під відео; текст вирівняно по верху відеокартки від 1200 px. Планшетна/мобільна композиція збережена.
- Sticky-панель: прихована, доки Hero CTA не пройшла верхню межу з буфером 16 px; показ через 180 мс стабільної видимості; приховування біля форми (128 px), при фокусі в полях, масштабуванні/імовірній клавіатурі та поверненні до Hero. Ці перевірені правила не змінювалися під час підготовки релізу.

## Додаткова браузерна перевірка

`npm test` та `npm run check` працюють без залежностей. `npm run qa:browser` — окремий необов’язковий сценарій для середовища з уже встановленим Playwright і Chromium/Chrome; пакет не додає Playwright до npm-залежностей сайту.

1. Запустіть `npm run dev`.
2. Якщо Playwright доступний у поточному Node-середовищі, виконайте `npm run qa:browser`.
3. Інакше задайте `PLAYWRIGHT_MODULE` як абсолютний шлях до встановленого `playwright/index.mjs`. За потреби задайте `BROWSER_EXECUTABLE` як шлях до Chrome; `QA_BASE_URL` за замовчуванням `http://127.0.0.1:4173`, дозволені лише localhost-адреси.

Сценарій перевіряє desktop/mobile, sticky на 375/390 px, форму з mock 503/200, відгуки, FAQ, video preload/play/seek та відсутність JS errors. Production hostname для перевірки приховування demo підмінено локальними файлами; реальний deployment не відкривається. API заявки перехоплено: реальних Telegram-повідомлень немає. Для sticky тест прокручує за **фактичну CTA**, а не лише до сусідньої секції.

## Premium Experience v2.2.0

- CSS motion tokens узгоджують переходи; CTA змінюють колір і стан натискання без зміщення. Hover застосовується лише за `(hover: hover) and (pointer: fine)`.
- Поля мають короткі переходи рамки/фону, помітний focus і error; loading та результати використовують наявні aria-busy, disabled і status classes. Payload та повідомлення не змінені.
- Уточнені H3, відступи споріднених карток та стани текстових посилань. Hover-ефектів для інформаційних карток немає.
- FAQ залишається native details/summary: тільки fade відкритої відповіді 140 мс, без анімації висоти й JS-перехоплення.
- `experience.js` асинхронно підключається після основних функцій. Чотири другорядні заголовки отримують одноразовий fade 320 мс із translateY(8px); до JS й до IntersectionObserver контент повністю видимий. При reduced motion спостереження не запускається або припиняється, активні ефекти скасовуються.
- Hero, sticky-пороги, медіа, контент, ціни, API, GA4/UTM/consent, SEO та CSP збережені. Stagger, анімація Hero, анімація sticky-панелі й scroll-jacking відсутні.
- `npm run qa:browser` додатково перевіряє hover/active без руху, стани форми, reveal once, reduced motion (також зміну під час сесії), відмову motion-модуля, no-JS на 320/390/1440 і touch-емуляцію. Firefox/WebKit та фізичні мобільні пристрої ще не перевірені.
